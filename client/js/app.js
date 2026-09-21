/**
 * Aura Analytics - Coordinador Principal
 * Control de sesiones de voz, WebSockets y estados del sistema
 */
document.addEventListener('DOMContentLoaded', () => {
  const statusLabel = document.getElementById('status-label');
  const statusIndicator = document.getElementById('system-status-indicator');
  const statusDot = statusIndicator ? statusIndicator.querySelector('.status-dot') : null;
  
  const voiceControlBtn = document.getElementById('voice-control-btn');
  const orbTapArea = document.getElementById('orb-tap-area');
  const voiceHintLabel = document.getElementById('voice-hint-label');
  
  const subtitlesSpeaker = document.getElementById('subtitles-speaker');
  const subtitlesText = document.getElementById('subtitles-text');
  
  const quickTextForm = document.getElementById('quick-text-form');
  const textPromptInput = document.getElementById('text-prompt-input');
  
  const promptChips = document.querySelectorAll('.prompt-chip');
  const btnToggleDashboard = document.getElementById('btn-toggle-dashboard');

  const settingsModal = document.getElementById('settings-modal');
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const voiceSelect = document.getElementById('voice-select');

  // Inicialización de componentes de Seguridad
  const authManager = new AuthManager();
  window.authManager = authManager;

  // Inicialización de componentes visuales y analíticos
  const orb = new VoiceOrb('orb-canvas');
  const dashboard = new DashboardController();
  
  let ws = null;
  let isWsConnected = false;
  let currentState = 'ready';

  // Gestor de Datasets
  const filesManager = new FilesManager({
    onDatasetChanged: (dataset) => {
      if (dataset && dataset.id) {
        setSubtitle('Aura', `Dataset activo: "${dataset.name}". Lista para consultas analíticas.`);
      } else {
        setSubtitle('Aura', 'Ningún dataset activo. Lista para consultas analíticas generales.');
      }
      initWebSocket();
    }
  });

  // Gestor de Audio
  const audioManager = new AudioManager({
    onAudioChunk: (base64Pcm) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'audio_chunk',
          pcm: base64Pcm
        }));
      }
    },
    onVolume: (vol) => {
      orb.setAudioIntensity(vol);
    },
    onAiSpeechStart: () => {
      setState('speaking');
    },
    onAiSpeechEnd: () => {
      if (audioManager.isRecording) {
        setState('listening');
      } else {
        setState('ready');
      }
    }
  });

  let reconnectTimer = null;
  let reconnectDelay = 4000;

  function initWebSocket() {
    const token = authManager.getToken();
    if (!token || !document.body.classList.contains('is-authenticated')) return;

    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      try { ws.close(); } catch {}
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      isWsConnected = true;
      reconnectDelay = 4000;
      if (audioManager.isRecording) {
        setState('listening');
      } else {
        setState('ready');
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
      } catch (err) {
        console.error('Error parseando mensaje WS:', err);
      }
    };

    ws.onclose = (event) => {
      isWsConnected = false;
      if (event && event.code === 4001) {
        authManager.lock('Tu sesión ha expirado. Introduce la contraseña nuevamente.');
        return;
      }
      if (audioManager.isRecording) {
        audioManager.stopRecording();
      }
      setState('ready', 'DESCONECTADO');
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (authManager.getToken() && document.body.classList.contains('is-authenticated')) {
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 1.5, 20000);
          initWebSocket();
        }, reconnectDelay);
      }
    };

    ws.onerror = () => {
      setState('error', 'ERROR DE ENLACE');
    };
  }

  function handleServerMessage(data) {
    switch (data.type) {
      case 'ready':
        if (audioManager.isRecording) {
          setState('listening');
          setSubtitle('Aura', 'Canal de voz activo. Te escucho...');
        } else {
          setState('ready');
          setSubtitle('Aura', 'Canal de voz activo. Puede formular su consulta analítica.');
        }
        break;

      case 'session_closed':
        console.warn('⚠️ Sesión de audio reconectando en segundo plano...');
        if (audioManager.isRecording) {
          setSubtitle('Aura', 'Reanudando enlace de voz...');
        }
        break;

      case 'audio':
        audioManager.playAudioChunk(data.pcm);
        break;

      case 'caption':
        if (data.text) {
          setSubtitle('Aura', data.text);
        }
        break;

      case 'interrupted':
        audioManager.stopAllPlayback();
        if (audioManager.isRecording) {
          setState('listening');
        }
        break;

      case 'render_tool':
        setState('analyzing');
        executeVisualTool(data.tool, data.args);
        break;

      case 'turn_complete':
        if (!audioManager.isPlaying) {
          if (audioManager.isRecording) {
            setState('listening');
          } else {
            setState('ready');
          }
        }
        break;

      case 'error':
        setSubtitle('Sistema', data.message);
        setState('error');
        break;
    }
  }

  function executeVisualTool(toolName, args) {
    setSubtitle('Aura', `Generando visualización: ${args.title || toolName}...`);

    if (toolName === 'show_chart') {
      dashboard.renderChart(args);
    } else if (toolName === 'show_kpi_cards') {
      dashboard.renderKpiCards(args);
    } else if (toolName === 'show_data_table') {
      dashboard.renderDataTable(args);
    }
  }

  function setState(state, customLabel = null) {
    currentState = state;
    orb.setState(state);

    if (statusDot) statusDot.className = 'status-dot';

    switch (state) {
      case 'listening':
        if (statusDot) statusDot.classList.add('status-listening');
        if (statusLabel) statusLabel.textContent = customLabel || 'CANAL DE VOZ ABIERTO';
        voiceControlBtn.classList.add('is-active');
        voiceHintLabel.textContent = 'Escuchando audio...';
        break;

      case 'analyzing':
        if (statusDot) statusDot.classList.add('status-analyzing');
        if (statusLabel) statusLabel.textContent = customLabel || 'PROCESANDO CONSULTA...';
        voiceControlBtn.classList.add('is-active');
        voiceHintLabel.textContent = 'Procesando inferencia...';
        break;

      case 'speaking':
        if (statusDot) statusDot.classList.add('status-speaking');
        if (statusLabel) statusLabel.textContent = customLabel || 'TRANSMITIENDO RESPUESTA';
        voiceControlBtn.classList.add('is-active');
        voiceHintLabel.textContent = 'Aura respondiendo...';
        break;

      case 'error':
        if (statusDot) statusDot.classList.add('status-error');
        if (statusLabel) statusLabel.textContent = customLabel || 'FALLA DE ENLACE';
        voiceControlBtn.classList.remove('is-active');
        voiceHintLabel.textContent = 'Reconectando con el servidor...';
        if (audioManager.isRecording) {
          audioManager.stopRecording();
        }
        break;

      case 'ready':
      default:
        if (statusDot) statusDot.classList.add('status-ready');
        if (statusLabel) statusLabel.textContent = customLabel || 'SISTEMA LISTO';
        voiceControlBtn.classList.remove('is-active');
        voiceHintLabel.textContent = 'Iniciar consulta por voz';
        if (audioManager.isRecording) {
          audioManager.stopRecording();
        }
        break;
    }
  }

  function setSubtitle(speaker, text) {
    subtitlesSpeaker.textContent = speaker + ':';
    subtitlesText.textContent = text;
  }

  async function toggleVoice() {
    if (window.triggerHaptic) window.triggerHaptic(20);
    if (audioManager.isRecording) {
      audioManager.stopRecording();
      setState('ready');
      setSubtitle('Sistema', 'Micrófono en pausa. Pulsa para reanudar.');
    } else {
      try {
        await audioManager.startRecording();
        setState('listening');
        setSubtitle('Usuario', 'Transmitiendo audio...');
      } catch (err) {
        console.error('Error al activar micrófono:', err);
        alert('Se requiere autorización para utilizar el dispositivo de audio.');
        setState('ready');
      }
    }
  }

  if (voiceControlBtn) voiceControlBtn.addEventListener('click', toggleVoice);
  if (orbTapArea) orbTapArea.addEventListener('click', toggleVoice);
  const btnToggleDashboardModal = document.getElementById('btn-toggle-dashboard-modal');
  if (btnToggleDashboard) btnToggleDashboard.addEventListener('click', () => dashboard.toggle());
  if (btnToggleDashboardModal) {
    btnToggleDashboardModal.addEventListener('click', () => {
      if (settingsModal) settingsModal.classList.add('hidden');
      dashboard.open();
    });
  }

  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (window.triggerHaptic) window.triggerHaptic(12);
      const prompt = chip.getAttribute('data-prompt');
      sendTextPrompt(prompt);
    });
  });

  if (quickTextForm) {
    quickTextForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = textPromptInput.value.trim();
      if (!text) return;
      textPromptInput.value = '';
      sendTextPrompt(text);
    });
  }

  function sendTextPrompt(text) {
    audioManager.init();
    setSubtitle('Usuario', text);
    setState('analyzing');
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'text_prompt',
        text: text
      }));
    }
  }

  if (btnOpenSettings && settingsModal) {
    btnOpenSettings.addEventListener('click', () => settingsModal.classList.remove('hidden'));
  }
  if (btnCloseSettings && settingsModal) {
    btnCloseSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
  }
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
      }
    });
  }

  // Segmented Control Tabs en el Centro de Control
  const tabPills = document.querySelectorAll('.modal-tab-pill');
  const tabPanes = document.querySelectorAll('.modal-tab-pane');
  tabPills.forEach(pill => {
    pill.addEventListener('click', () => {
      if (window.triggerHaptic) window.triggerHaptic(10);
      const targetId = pill.getAttribute('data-tab');
      tabPills.forEach(p => p.classList.toggle('is-active', p === pill));
      tabPanes.forEach(pane => pane.classList.toggle('is-active', pane.id === targetId));
    });
  });
  if (voiceSelect) {
    voiceSelect.addEventListener('change', (e) => {
      const newVoice = e.target.value;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'update_voice',
          voice: newVoice
        }));
      }
      initWebSocket();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.activeElement !== textPromptInput && document.activeElement?.id !== 'auth-password-input') {
      e.preventDefault();
      toggleVoice();
    }
  });

  // Callbacks de autenticación
  authManager.onAuthenticated = (token) => {
    initWebSocket();
    filesManager.fetchDatasets();
  };

  authManager.onLocked = () => {
    if (audioManager.isRecording) {
      audioManager.stopRecording();
    }
    audioManager.stopAllPlayback();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      try { ws.close(); } catch {}
      ws = null;
    }
    setState('ready', 'TERMINAL BLOQUEADA');
  };

  // Botón de bloqueo manual dentro del modal de configuración
  const btnLockSessionModal = document.getElementById('btn-lock-session-modal');
  if (btnLockSessionModal) {
    btnLockSessionModal.addEventListener('click', () => {
      if (settingsModal) settingsModal.classList.add('hidden');
      authManager.lock('Terminal bloqueada manualmente.');
    });
  }

  // Inicializar control de acceso
  authManager.init();
});

