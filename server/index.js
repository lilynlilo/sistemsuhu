// ─── HydroControl Backend Server ──────────────────────────────
const express = require('express');
const cors = require('cors');
const db = require('./db');
const mqttClient = require('./mqtt-client');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Inisialisasi Database ───────────────────────────────────
db.initDatabase();
const insert = db.insertReading();

// ─── Throttle: simpan ke database maksimal setiap 10 detik ───
let lastSaveTime = 0;
const SAVE_INTERVAL = 10000; // 10 detik

// ─── Koneksi MQTT ────────────────────────────────────────────
mqttClient.connectMQTT((data) => {
  const now = Date.now();
  if (now - lastSaveTime >= SAVE_INTERVAL) {
    lastSaveTime = now;
    try {
      insert(data.waterTemp, data.envTemp, data.peltierOn);
    } catch (err) {
      console.error('X Gagal simpan ke database:', err.message);
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// REST API ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mqtt: mqttClient.isConnected() ? 'connected' : 'disconnected',
    database: 'sqlite',
    totalReadings: db.getTotalCount().count,
    uptime: process.uptime(),
  });
});

// ─── Data Sensor Terbaru ─────────────────────────────────────
app.get('/api/latest', (req, res) => {
  try {
    // Prioritaskan data live dari MQTT
    const liveData = mqttClient.getLatestData();

    // Juga ambil dari database sebagai fallback
    const dbData = db.getLatest();

    res.json({
      live: liveData,
      stored: dbData || null,
      mqttConnected: mqttClient.isConnected(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Data Realtime (50 pembacaan terakhir untuk chart) ───────
app.get('/api/recent', (req, res) => {
  try {
    const count = parseInt(req.query.count) || 50;
    const readings = db.getRecentReadings(Math.min(count, 200));
    res.json(readings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Data History berdasarkan Tanggal ────────────────────────
app.get('/api/history', (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start) {
      return res.status(400).json({ error: 'Parameter "start" wajib diisi (format: YYYY-MM-DD)' });
    }

    const startDate = `${start} 00:00:00`;
    const endDate = end ? `${end} 23:59:59` : `${start} 23:59:59`;

    const history = db.getHistory(startDate, endDate);
    const stats = db.getStats(startDate, endDate);

    res.json({
      data: history,
      stats: stats,
      range: { start: startDate, end: endDate },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Statistik ───────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  try {
    const { start, end } = req.query;

    const now = new Date();
    const startDate = start || now.toISOString().split('T')[0];
    const endDate = end || startDate;

    const stats = db.getStats(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Kontrol Peltier (ON/OFF) ────────────────────────────────
app.post('/api/control', (req, res) => {
  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Parameter "command" wajib diisi (ON/OFF/1/0)' });
    }

    const validCommands = ['ON', 'OFF', '1', '0'];
    const cmd = command.toString().toUpperCase();

    if (!validCommands.includes(cmd)) {
      return res.status(400).json({ error: 'Command tidak valid. Gunakan: ON, OFF, 1, atau 0' });
    }

    const success = mqttClient.publishControl(cmd);

    if (success) {
      res.json({
        status: 'ok',
        message: `Perintah "${cmd}" dikirim ke Arduino`,
        command: cmd,
      });
    } else {
      res.status(503).json({
        error: 'MQTT tidak terhubung. Perintah tidak dapat dikirim.',
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SSE (Server-Sent Events) untuk Data Real-time ───────────
app.get('/api/sse', (req, res) => {
  // Set header untuk SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Untuk Nginx

  // Kirim comment untuk menjaga koneksi
  res.write(':ok\n\n');

  // Register client ke MQTT module
  mqttClient.addSSEClient(res);

  // Heartbeat setiap 30 detik agar koneksi tidak timeout
  const heartbeat = setInterval(() => {
    try {
      res.write(':heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

const path = require('path');

// ─── Serve Static Files in Production ────────────────────────
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback all other routes to index.html for Single Page Application
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  🌿 HydroControl Backend Server');
  console.log('═══════════════════════════════════════════════');
  console.log(`  🚀 Server    : http://localhost:${PORT}`);
  console.log(`  📡 SSE       : http://localhost:${PORT}/api/sse`);
  console.log(`  📊 API       : http://localhost:${PORT}/api/latest`);
  console.log(`  📅 History   : http://localhost:${PORT}/api/history?start=YYYY-MM-DD`);
  console.log(`  🎮 Control   : POST http://localhost:${PORT}/api/control`);
  console.log(`  ❤️  Health    : http://localhost:${PORT}/api/health`);
  console.log('═══════════════════════════════════════════════');
  console.log('');
});
