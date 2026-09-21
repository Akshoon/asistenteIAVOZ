const WebSocket = require('ws');

class GeminiLiveBridge {
  constructor(clientWs, dataEngine, config = {}) {
    this.clientWs = clientWs;
    this.dataEngine = dataEngine;
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    this.model = config.model || process.env.GEMINI_LIVE_MODEL || 'models/gemini-2.5-flash-native-audio-latest';
    this.voice = config.voice || process.env.GEMINI_VOICE || 'Aoede';
    this.language = config.language || 'es';
    
    this.geminiWs = null;
    this.isSetupComplete = false;
    this.sessionActive = false;
  }

  connect() {
    const host = 'generativelanguage.googleapis.com';
    const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

    this.geminiWs = new WebSocket(uri);

    this.geminiWs.on('open', () => {
      console.log('🔗 Conectado a Gemini Live API WebSocket');
      this.sendSetup();
    });

    this.geminiWs.on('message', (raw) => {
      this.handleGeminiMessage(raw);
    });

    this.geminiWs.on('error', (err) => {
      console.error('❌ Error en WebSocket de Gemini Live:', err.message);
      this.sendToClient({ type: 'error', message: 'Error de conexión con Gemini Live: ' + err.message });
    });

    this.geminiWs.on('close', (code, reason) => {
      const reasonStr = reason ? reason.toString() : '';
      console.log(`🔌 Conexión con Gemini Live cerrada: ${code} - ${reasonStr}`);
      this.sessionActive = false;
      if (code === 1011 && reasonStr.includes('quota')) {
        this.sendToClient({ type: 'error', message: 'Límite de conexiones concurrentes alcanzado momentáneamente. Reintentando en unos segundos...' });
      } else {
        this.sendToClient({ type: 'session_closed', code, reason: reasonStr });
      }
    });
  }

  sendSetup() {
    const dataContext = this.dataEngine ? this.dataEngine.getPromptContext() : '';

    const systemPrompt = `
Eres Aura, analista experta de inteligencia de negocios y analítica de datos.
Tu estilo de comunicación debe ser HUMANO, NATURAL, FLUIDO Y CONCISO:
- Habla como una colega analista de alto nivel en una reunión ejecutiva: profesional, cercana y al grano, sin sonar como un robot que solo escupe cifras desnudas.
- Mantén tus intervenciones breves: aproximadamente 1 a 2 oraciones bien construidas (alrededor de 20 a 35 palabras).
- Combina la cifra principal con un insight o contexto valioso sobre lo que el usuario está viendo.

${dataContext}

REGLAS DE INTERACCIÓN Y VISUALIZACIÓN:
1. SIEMPRE que el usuario te consulte sobre ventas, informes, KPIs, comparativas o el estado del negocio, INVOCA DE INMEDIATO la herramienta visual adecuada (\`show_chart\`, \`show_kpi_cards\` o \`show_data_table\`) para que el gráfico se proyecte automáticamente en su pantalla.
2. Al proyectar el gráfico, acompaña la visualización con una explicación concisa y humana de lo que destaca en los datos.
   - Ejemplo natural: "Aquí tienes el desglose en pantalla: las ventas alcanzaron 245.000 dólares, impulsadas principalmente por el crecimiento sostenido de la región Norte."
   - Ejemplo natural: "Te proyecté los KPIs principales: cerramos con un MRR de 212.000 dólares y un churn del 1.5%, lo que refleja una retención muy saludable este mes."
   - Ejemplo comparativo: "Como ves en la comparativa, Electrónica lidera ampliamente en ingresos totales, aunque Ropa mantiene un margen porcentual más alto."
3. Usa siempre los datos reales del dataset activo.
4. No uses emojis ni discursos largos. Sé humana, clara y directa.
`;

    const setupMessage = {
      setup: {
        model: this.model,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.voice
              }
            }
          }
        },
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: 'show_chart',
                description: 'Muestra un gráfico visual interactivo en el dashboard en pantalla.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    type: {
                      type: 'STRING',
                      enum: ['bar', 'line', 'pie', 'doughnut', 'scatter'],
                      description: 'Tipo de gráfico'
                    },
                    title: {
                      type: 'STRING',
                      description: 'Título representativo del gráfico'
                    },
                    description: {
                      type: 'STRING',
                      description: 'Breve explicación o conclusión del gráfico'
                    },
                    labels: {
                      type: 'ARRAY',
                      items: { type: 'STRING' },
                      description: 'Etiquetas del eje X o categorías'
                    },
                    datasets: {
                      type: 'ARRAY',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          label: { type: 'STRING', description: 'Nombre de la serie' },
                          data: { type: 'ARRAY', items: { type: 'NUMBER' }, description: 'Valores numéricos' },
                          borderColor: { type: 'STRING' },
                          backgroundColor: { type: 'STRING' }
                        },
                        required: ['label', 'data']
                      },
                      description: 'Conjuntos de datos'
                    }
                  },
                  required: ['type', 'title', 'labels', 'datasets']
                }
              },
              {
                name: 'show_kpi_cards',
                description: 'Despliega tarjetas de indicadores clave (KPIs) con valores y variación.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    title: { type: 'STRING', description: 'Título general de la sección' },
                    cards: {
                      type: 'ARRAY',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          title: { type: 'STRING', description: 'Nombre del KPI (ej. Ventas Totales)' },
                          value: { type: 'STRING', description: 'Valor formateado (ej. $245,000)' },
                          change: { type: 'STRING', description: 'Porcentaje o cambio (ej. +14.5%)' },
                          trend: { type: 'STRING', enum: ['up', 'down', 'neutral'], description: 'Dirección' },
                          subtitle: { type: 'STRING', description: 'Detalle o período' }
                        },
                        required: ['title', 'value']
                      }
                    }
                  },
                  required: ['cards']
                }
              },
              {
                name: 'show_data_table',
                description: 'Muestra una tabla con datos estructurados en el dashboard.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    title: { type: 'STRING', description: 'Título de la tabla' },
                    headers: {
                      type: 'ARRAY',
                      items: { type: 'STRING' },
                      description: 'Nombres de las columnas'
                    },
                    rows: {
                      type: 'ARRAY',
                      items: {
                        type: 'ARRAY',
                        items: { type: 'STRING' }
                      },
                      description: 'Filas de celdas'
                    }
                  },
                  required: ['title', 'headers', 'rows']
                }
              }
            ]
          }
        ]
      }
    };

    this.geminiWs.send(JSON.stringify(setupMessage));
  }

  handleGeminiMessage(raw) {
    try {
      const resp = JSON.parse(raw.toString());

      if (resp.setupComplete) {
        this.isSetupComplete = true;
        this.sessionActive = true;
        console.log('✅ Sesión Gemini Live lista!');
        this.sendToClient({ type: 'ready', model: this.model, voice: this.voice });
        return;
      }

      // Si hay llamadas a herramientas (Tool Calls)
      if (resp.toolCall && resp.toolCall.functionCalls) {
        console.log('⚡ Gemini Live solicitó Tool Calls:', resp.toolCall.functionCalls.length);
        const functionResponses = [];

        for (const call of resp.toolCall.functionCalls) {
          console.log(`  -> Invocando: ${call.name} (${call.id})`);
          
          // Notificar al cliente para que renderice el gráfico/kpi/tabla en el Dashboard
          this.sendToClient({
            type: 'render_tool',
            tool: call.name,
            callId: call.id,
            args: call.args
          });

          // Confirmar ejecución de vuelta a Gemini Live
          functionResponses.push({
            id: call.id,
            name: call.name,
            response: {
              output: {
                success: true,
                message: `La visualización ${call.name} se desplegó correctamente en el dashboard del usuario.`
              }
            }
          });
        }

        // Enviar confirmación a Gemini para que continue hablando
        if (this.geminiWs && this.geminiWs.readyState === WebSocket.OPEN) {
          this.geminiWs.send(JSON.stringify({
            toolResponse: {
              functionResponses: functionResponses
            }
          }));
        }
        return;
      }

      // Procesar contenido del modelo (Audio y Texto)
      if (resp.serverContent) {
        const sc = resp.serverContent;

        if (sc.interrupted) {
          console.log('🛑 Modelo interrumpido por voz del usuario');
          this.sendToClient({ type: 'interrupted' });
        }

        if (sc.modelTurn && sc.modelTurn.parts) {
          for (const part of sc.modelTurn.parts) {
            // Audio PCM recibido (24kHz)
            if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('audio/pcm')) {
              this.sendToClient({
                type: 'audio',
                pcm: part.inlineData.data,
                mimeType: part.inlineData.mimeType
              });
            }

            // Subtítulos o texto explicativo
            if (part.text) {
              this.sendToClient({
                type: 'caption',
                text: part.text,
                role: 'model'
              });
            }
          }
        }

        if (sc.turnComplete) {
          this.sendToClient({ type: 'turn_complete' });
        }
      }
    } catch (err) {
      console.error('Error procesando mensaje de Gemini:', err);
    }
  }

  handleClientMessage(message) {
    try {
      const data = typeof message === 'string' ? JSON.parse(message) : JSON.parse(message.toString());

      if (data.type === 'audio_chunk' && data.pcm) {
        // Enviar fragmento de audio PCM (16kHz) a Gemini Live
        if (this.geminiWs && this.geminiWs.readyState === WebSocket.OPEN && this.isSetupComplete) {
          this.geminiWs.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: 'audio/pcm;rate=16000',
                  data: data.pcm
                }
              ]
            }
          }));
        }
      } else if (data.type === 'text_prompt' && data.text) {
        // Enviar mensaje de texto directamente
        if (this.geminiWs && this.geminiWs.readyState === WebSocket.OPEN && this.isSetupComplete) {
          this.geminiWs.send(JSON.stringify({
            clientContent: {
              turns: [
                {
                  role: 'user',
                  parts: [{ text: data.text }]
                }
              ],
              turnComplete: true
            }
          }));
        }
      } else if (data.type === 'update_voice') {
        this.voice = data.voice || this.voice;
      }
    } catch (err) {
      console.error('Error procesando mensaje del cliente:', err);
    }
  }

  sendToClient(obj) {
    if (this.clientWs && this.clientWs.readyState === WebSocket.OPEN) {
      this.clientWs.send(JSON.stringify(obj));
    }
  }

  close() {
    if (this.geminiWs) {
      try {
        this.geminiWs.close();
      } catch {}
      this.geminiWs = null;
    }
  }
}

module.exports = GeminiLiveBridge;
