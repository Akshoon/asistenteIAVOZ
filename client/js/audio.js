/**
 * Controlador de Audio: Grabación PCM 16kHz y Reproducción PCM 24kHz
 * Conexión con Web Audio API y AnalyserNode para alimentar el Orbe 3D
 */
class AudioManager {
  constructor(options = {}) {
    this.onAudioChunk = options.onAudioChunk || (() => {});
    this.onVolume = options.onVolume || (() => {});
    this.onAiSpeechStart = options.onAiSpeechStart || (() => {});
    this.onAiSpeechEnd = options.onAiSpeechEnd || (() => {});

    this.inputAudioCtx = null;
    this.outputAudioCtx = null;
    this.micStream = null;
    this.processor = null;
    
    this.isRecording = false;
    this.isPlaying = false;
    
    // Cola de reproducción de audio
    this.audioQueue = [];
    this.nextScheduledTime = 0;
    this.activeSources = [];

    // Analizador de frecuencias para la IA
    this.outputAnalyser = null;
    this.analyserData = null;
  }

  async init() {
    if (!this.outputAudioCtx) {
      this.outputAudioCtx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000
      });
      this.outputAnalyser = this.outputAudioCtx.createAnalyser();
      this.outputAnalyser.fftSize = 64;
      this.analyserData = new Uint8Array(this.outputAnalyser.frequencyBinCount);
      this.outputAnalyser.connect(this.outputAudioCtx.destination);
    }
  }

  async startRecording() {
    await this.init();
    if (this.outputAudioCtx.state === 'suspended') {
      await this.outputAudioCtx.resume();
    }

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.inputAudioCtx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });

      const source = this.inputAudioCtx.createMediaStreamSource(this.micStream);
      
      // Analizador para volumen del micrófono del usuario
      const inputAnalyser = this.inputAudioCtx.createAnalyser();
      inputAnalyser.fftSize = 64;
      source.connect(inputAnalyser);

      // ScriptProcessor para capturar buffers PCM
      const bufferSize = 2048;
      this.processor = this.inputAudioCtx.createScriptProcessor(bufferSize, 1, 1);

      const inputData = new Uint8Array(inputAnalyser.frequencyBinCount);

      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;

        const inputChannel = e.inputBuffer.getChannelData(0);
        
        // Medir volumen para el orbe
        inputAnalyser.getByteFrequencyData(inputData);
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += inputData[i];
        const avgVolume = sum / inputData.length / 255;
        this.onVolume(avgVolume);

        // Convertir Float32 (-1.0 a 1.0) a Int16 (-32768 a 32767)
        const pcm16 = new Int16Array(inputChannel.length);
        for (let i = 0; i < inputChannel.length; i++) {
          const s = Math.max(-1, Math.min(1, inputChannel[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convertir a Base64 y emitir
        const base64Pcm = this.arrayBufferToBase64(pcm16.buffer);
        this.onAudioChunk(base64Pcm);
      };

      source.connect(this.processor);
      this.processor.connect(this.inputAudioCtx.destination);
      this.isRecording = true;
      console.log('🎤 Micrófono activo (PCM 16kHz)');
    } catch (err) {
      console.error('Error al iniciar micrófono:', err);
      throw err;
    }
  }

  stopRecording() {
    this.isRecording = false;
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.inputAudioCtx) {
      this.inputAudioCtx.close();
      this.inputAudioCtx = null;
    }
    console.log('🎤 Micrófono detenido');
  }

  playAudioChunk(base64Data) {
    if (!this.outputAudioCtx) return;
    if (this.outputAudioCtx.state === 'suspended') {
      this.outputAudioCtx.resume();
    }

    try {
      // Decodificar Base64 a Int16Array
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);

      // Convertir a Float32Array para Web Audio
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      // Crear AudioBuffer a 24000 Hz
      const audioBuffer = this.outputAudioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      // Programar reproducción continua sin cortes
      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAnalyser);

      const currentTime = this.outputAudioCtx.currentTime;
      if (this.nextScheduledTime < currentTime) {
        this.nextScheduledTime = currentTime;
      }

      source.start(this.nextScheduledTime);
      this.nextScheduledTime += audioBuffer.duration;

      this.activeSources.push(source);
      this.isPlaying = true;
      this.onAiSpeechStart();

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) this.activeSources.splice(idx, 1);
        if (this.activeSources.length === 0) {
          this.isPlaying = false;
          this.onAiSpeechEnd();
        }
      };

      // Loop de análisis para animar el orbe con la voz de la IA
      this.sampleAiVolume();
    } catch (err) {
      console.error('Error al reproducir chunk de audio:', err);
    }
  }

  sampleAiVolume() {
    if (!this.isPlaying || !this.outputAnalyser) return;
    this.outputAnalyser.getByteFrequencyData(this.analyserData);
    let sum = 0;
    for (let i = 0; i < this.analyserData.length; i++) sum += this.analyserData[i];
    const avg = (sum / this.analyserData.length / 255) * 1.5;
    this.onVolume(avg);

    if (this.isPlaying) {
      requestAnimationFrame(() => this.sampleAiVolume());
    }
  }

  stopAllPlayback() {
    for (const s of this.activeSources) {
      try { s.stop(); } catch {}
    }
    this.activeSources = [];
    this.nextScheduledTime = 0;
    this.isPlaying = false;
    this.onAiSpeechEnd();
  }

  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

window.AudioManager = AudioManager;
