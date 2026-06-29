require('dotenv').config();

// ─── HydroControl Backend Server ──────────────────────────────
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

db.initDatabase();

// ═══════════════════════════════════════════════════════════════
// REST API ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const { count } = await db.getTotalCount();
    res.json({
      status: 'ok',
      database: 'supabase',
      totalReadings: count,
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Data Sensor Terbaru ─────────────────────────────────────
app.get('/api/latest', async (req, res) => {
  try {
    const dbData = await db.getLatest();
    res.json({ stored: dbData || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Data Realtime (50 pembacaan terakhir untuk chart) ───────
app.get('/api/recent', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 50;
    const readings = await db.getRecentReadings(Math.min(count, 200));
    res.json(readings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Data History berdasarkan Tanggal ────────────────────────
app.get('/api/history', async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start) {
      return res.status(400).json({ error: 'Parameter "start" wajib diisi (format: YYYY-MM-DD)' });
    }

    const startDate = `${start} 00:00:00`;
    const endDate = end ? `${end} 23:59:59` : `${start} 23:59:59`;

    const [history, stats] = await Promise.all([
      db.getHistory(startDate, endDate),
      db.getStats(startDate, endDate),
    ]);

    res.json({ data: history, stats, range: { start: startDate, end: endDate } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Statistik ───────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const { start, end } = req.query;
    const now = new Date();
    const startDate = start || now.toISOString().split('T')[0];
    const endDate = end || startDate;
    const stats = await db.getStats(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Kontrol Peltier — tulis perintah ke Supabase ────────────
app.post('/api/control', async (req, res) => {
  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Parameter "command" wajib diisi (ON/OFF)' });
    }

    const cmd = command.toString().toUpperCase();
    const normalizedCmd = cmd === '1' ? 'ON' : cmd === '0' ? 'OFF' : cmd;

    if (!['ON', 'OFF'].includes(normalizedCmd)) {
      return res.status(400).json({ error: 'Command tidak valid. Gunakan: ON atau OFF' });
    }

    const result = await db.insertCommand(normalizedCmd);
    res.json({
      status: 'ok',
      message: `Perintah "${normalizedCmd}" dikirim ke Arduino`,
      command: normalizedCmd,
      id: result.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Serve Static Files in Production ────────────────────────
app.use(express.static(path.join(__dirname, '../dist')));

app.get('*all', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  HydroControl Backend Server');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Server  : http://localhost:${PORT}`);
  console.log(`  API     : http://localhost:${PORT}/api/latest`);
  console.log(`  History : http://localhost:${PORT}/api/history?start=YYYY-MM-DD`);
  console.log(`  Control : POST http://localhost:${PORT}/api/control`);
  console.log(`  Health  : http://localhost:${PORT}/api/health`);
  console.log('═══════════════════════════════════════════════');
  console.log('');
});
