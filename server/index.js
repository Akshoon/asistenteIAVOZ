require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const DataEngine = require('./dataEngine');
const GeminiLiveBridge = require('./geminiLive');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3000;
const APP_PASSWORD = process.env.APP_PASSWORD || 'Aura-Shield-2026!';
const AUTH_SECRET = process.env.AUTH_SECRET || 'aura_enterprise_secret_sig_' + (process.env.APP_PASSWORD || 'default');

// Rate limiting para prevención de fuerza bruta en login
const loginAttempts = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };
  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingSecs = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingSecs };
  }
  if (record.lockedUntil && now >= record.lockedUntil) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }
  return { allowed: true };
}

function registerFailedAttempt(ip) {
  const now = Date.now();
  let record = loginAttempts.get(ip);
  if (!record || (record.lockedUntil && now >= record.lockedUntil)) {
    record = { count: 0, firstAttempt: now, lockedUntil: 0 };
  }
  record.count += 1;
  // Bloquear 60 segundos tras 5 intentos fallidos
  if (record.count >= 5) {
    record.lockedUntil = now + 60000;
  }
  loginAttempts.set(ip, record);
}

function resetRateLimit(ip) {
  loginAttempts.delete(ip);
}

// Generación y verificación segura de tokens de sesión
function generateAuthToken() {
  const payload = `${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  if (!payload || !sig) return false;

  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  if (sig.length !== expectedSig.length) return false;

  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return false;
    }
  } catch (err) {
    return false;
  }

  const [timeStr] = payload.split('_');
  const timestamp = parseInt(timeStr, 10);
  if (isNaN(timestamp)) return false;

  // Validez de sesión: 30 días
  const age = Date.now() - timestamp;
  return age >= 0 && age < 30 * 24 * 60 * 60 * 1000;
}

function verifyPassword(inputPassword) {
  if (!inputPassword || typeof inputPassword !== 'string') return false;
  const inputBuf = Buffer.from(inputPassword);
  const targetBuf = Buffer.from(APP_PASSWORD);
  if (inputBuf.length !== targetBuf.length) {
    crypto.timingSafeEqual(inputBuf, inputBuf);
    return false;
  }
  return crypto.timingSafeEqual(inputBuf, targetBuf);
}

// Middleware de autenticación para endpoints protegidos
function requireAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (verifyAuthToken(token)) {
    return next();
  }
  return res.status(401).json({ error: 'No autorizado. Se requiere contraseña de acceso a la terminal.' });
}

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Motor de datos
const dataEngine = new DataEngine(uploadsDir);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Rutas de autenticación
app.post('/api/auth/login', (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const limitStatus = checkRateLimit(clientIp);
  if (!limitStatus.allowed) {
    return res.status(429).json({
      success: false,
      error: `Demasiados intentos fallidos. Intente de nuevo en ${limitStatus.remainingSecs} segundos.`
    });
  }

  const { password } = req.body || {};
  if (!verifyPassword(password)) {
    registerFailedAttempt(clientIp);
    return res.status(401).json({
      success: false,
      error: 'Contraseña incorrecta. Verifique e intente nuevamente.'
    });
  }

  resetRateLimit(clientIp);
  const token = generateAuthToken();
  res.json({ success: true, token });
});

app.get('/api/auth/check', (req, res) => {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (verifyAuthToken(token)) {
    return res.json({ authenticated: true });
  }
  return res.status(401).json({ authenticated: false, error: 'Sesión no válida o expirada.' });
});

// Rutas API protegidas para archivos y datasets
app.get('/api/files', requireAuth, (req, res) => {

  res.json({
    activeId: dataEngine.activeDatasetId,
    datasets: dataEngine.getAllDatasets()
  });
});

app.post('/api/files/upload', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo.' });
    }
    const dataset = dataEngine.processUploadedFile(req.file.path, req.file.originalname);
    res.json({ success: true, dataset });
  } catch (err) {
    console.error('Error al procesar archivo subido:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/files/active', requireAuth, (req, res) => {
  const { id } = req.body;
  const dataset = dataEngine.setActiveDataset(id);
  if (!dataset) {
    return res.status(404).json({ error: 'Dataset no encontrado.' });
  }
  res.json({ success: true, activeId: id, dataset });
});

app.get('/api/files/:id/preview', requireAuth, (req, res) => {
  const ds = dataEngine.datasets.get(req.params.id);
  if (!ds) return res.status(404).json({ error: 'Dataset no encontrado.' });
  res.json({
    name: ds.name,
    columns: ds.columns,
    rowCount: ds.rowCount,
    summary: ds.summary,
    preview: ds.preview
  });
});

app.get('/api/config', requireAuth, (req, res) => {
  res.json({
    model: process.env.GEMINI_LIVE_MODEL || 'models/gemini-2.5-flash-native-audio-latest',
    voice: process.env.GEMINI_VOICE || 'Aoede',
    hasKey: !!process.env.GEMINI_API_KEY
  });
});

// Manejador de WebSocket para sesiones de voz en vivo con autenticación de token
wss.on('connection', (ws, req) => {
  let token = null;
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    token = parsedUrl.searchParams.get('token');
  } catch (err) {}

  if (!verifyAuthToken(token)) {
    console.warn('⛔ Conexión WebSocket denegada: Token no válido o ausente');
    try {
      ws.send(JSON.stringify({ type: 'error', message: 'No autorizado. Se requiere contraseña de acceso.' }));
      ws.close(4001, 'Unauthorized');
    } catch (e) {}
    return;
  }

  console.log('⚡ Nuevo cliente web autenticado conectado a /ws');

  const bridge = new GeminiLiveBridge(ws, dataEngine, {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_LIVE_MODEL,
    voice: process.env.GEMINI_VOICE
  });

  bridge.connect();

  ws.on('message', (message) => {
    bridge.handleClientMessage(message);
  });

  ws.on('close', () => {
    console.log('❌ Cliente desconectado');
    bridge.close();
  });

  ws.on('error', (err) => {
    console.error('Error en WebSocket cliente:', err);
    bridge.close();
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`[AURA ANALYTICS] Enterprise Voice BI Online`);
  console.log(`Terminal Web: http://localhost:${PORT}`);
  console.log(`Motor Live: ${process.env.GEMINI_LIVE_MODEL || 'models/gemini-2.5-flash-native-audio-latest'}`);
  console.log(`====================================================`);
});
