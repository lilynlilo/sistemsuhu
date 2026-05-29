// ─── MQTT Client Module ───────────────────────────────────────
const mqtt = require('mqtt');

// ─── Konfigurasi MQTT (sama dengan Arduino) ─────────────────
const MQTT_CONFIG = {
  broker: 'mqtts://broker.avisha.id:8883',
  options: {
    username: 'azismaulana',
    password: 's]<f(kYFv$jC',
    rejectUnauthorized: false,
    reconnectPeriod: 5000,     // Auto-reconnect setiap 5 detik
    connectTimeout: 15000,
    keepalive: 60,             // Kirim PING setiap 60 detik agar broker tahu kita masih hidup
    clean: true,               // Mulai sesi bersih saat reconnect
  },
};

// ─── Topik MQTT (sesuaikan juga di Arduino) ──────────────────
const TOPICS = {
  SET:        'azismaulana/agus/set',
  SUHU_AIR:   'azismaulana/agus/suhu_air',
  SUHU_UDARA: 'azismaulana/agus/suhu_udara',
};

// ─── State ───────────────────────────────────────────────────
let client = null;
let mqttConnected = false;
let latestData = {
  waterTemp: 0,
  envTemp: 0,
  peltierOn: false,
  timestamp: new Date().toISOString(),
};

// SSE clients yang sedang terhubung
const sseClients = new Set();

// Callback ketika data baru diterima
let onDataCallback = null;

// Watchdog timer untuk memastikan koneksi tetap hidup
let watchdogTimer = null;
const WATCHDOG_INTERVAL = 30000; // Cek setiap 30 detik

// ─── Broadcast status MQTT ke SSE clients ────────────────────
function broadcastMqttStatus(status) {
  const statusEvent = { _mqttStatus: status };
  for (const c of sseClients) {
    try {
      c.write(`event: mqtt_status\ndata: ${JSON.stringify(statusEvent)}\n\n`);
    } catch (err) {
      sseClients.delete(c);
    }
  }
}

// ─── Subscribe ke semua topik ────────────────────────────────
function subscribeTopics() {
  if (!client) return;
  client.subscribe([TOPICS.SUHU_AIR, TOPICS.SUHU_UDARA], { qos: 1 }, (err) => {
    if (err) {
      console.error('❌ Gagal subscribe:', err);
    } else {
      console.log('📡 Subscribe ke:', TOPICS.SUHU_AIR, '&', TOPICS.SUHU_UDARA);
    }
  });
}

// ─── Watchdog: pastikan koneksi MQTT selalu hidup ────────────
function startWatchdog() {
  if (watchdogTimer) clearInterval(watchdogTimer);

  watchdogTimer = setInterval(() => {
    if (!client) {
      console.log('🐕 Watchdog: Client null, membuat koneksi baru...');
      createConnection();
      return;
    }

    if (!client.connected) {
      console.log('🐕 Watchdog: MQTT tidak terhubung, memaksa reconnect...');
      try {
        client.reconnect();
      } catch (err) {
        console.error('🐕 Watchdog: Gagal reconnect, membuat koneksi baru...', err.message);
        try { client.end(true); } catch (_) { /* ignore */ }
        createConnection();
      }
    }
  }, WATCHDOG_INTERVAL);
}

// ─── Buat koneksi MQTT baru ─────────────────────────────────
function createConnection() {
  // Gunakan clientId unik setiap kali koneksi baru agar broker tidak reject
  const options = {
    ...MQTT_CONFIG.options,
    clientId: `hydrocontrol-web-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };

  console.log('🔌 Menghubungkan ke MQTT Broker:', MQTT_CONFIG.broker);

  client = mqtt.connect(MQTT_CONFIG.broker, options);

  // ─── Connected ─────────────────────────────────────────────
  client.on('connect', () => {
    console.log('✅ MQTT Terhubung ke broker.avisha.id');
    mqttConnected = true;
    broadcastMqttStatus('connected');

    // Selalu re-subscribe saat (re)connect
    subscribeTopics();
  });

  // ─── Message diterima ──────────────────────────────────────
  client.on('message', (topic, message) => {
    const value = parseFloat(message.toString().trim());

    if (isNaN(value)) {
      console.warn('⚠️ Nilai tidak valid dari topik', topic, ':', message.toString());
      return;
    }

    let changed = false;

    if (topic === TOPICS.SUHU_AIR) {
      latestData.waterTemp = value;
      // Tentukan status peltier berdasarkan threshold 30°C (sama dengan Arduino)
      latestData.peltierOn = value > 30.0;
      changed = true;
    } else if (topic === TOPICS.SUHU_UDARA) {
      latestData.envTemp = value;
      changed = true;
    }

    if (changed) {
      latestData.timestamp = new Date().toISOString();

      console.log(
        `📊 Air: ${latestData.waterTemp}°C | Udara: ${latestData.envTemp}°C | Peltier: ${latestData.peltierOn ? 'ON' : 'OFF'}`
      );

      // Simpan ke database via callback
      if (onDataCallback) {
        onDataCallback(latestData);
      }

      // Broadcast ke semua SSE clients
      broadcastSSE(latestData);
    }
  });

  // ─── Error ─────────────────────────────────────────────────
  client.on('error', (err) => {
    console.error('❌ MQTT Error:', err.message);
    // Jangan panggil client.end() di sini, biarkan reconnectPeriod bekerja
  });

  // ─── Reconnecting ─────────────────────────────────────────
  client.on('reconnect', () => {
    console.log('🔄 MQTT Reconnecting...');
    mqttConnected = false;
    broadcastMqttStatus('connecting');
  });

  // ─── Offline (koneksi terputus) ────────────────────────────
  client.on('offline', () => {
    console.log('📴 MQTT Offline - koneksi terputus, akan reconnect otomatis...');
    mqttConnected = false;
    broadcastMqttStatus('error');
  });

  // ─── Close ─────────────────────────────────────────────────
  client.on('close', () => {
    console.log('🔒 MQTT Connection closed - reconnect otomatis aktif');
    mqttConnected = false;
    broadcastMqttStatus('error');
  });

  return client;
}

// ─── Koneksi ke MQTT Broker (entry point) ────────────────────
function connectMQTT(dataCallback) {
  onDataCallback = dataCallback;
  createConnection();
  startWatchdog();
  return client;
}

// ─── Publish perintah kontrol ke Arduino ─────────────────────
function publishControl(command) {
  if (!client || !client.connected) {
    console.error('❌ MQTT tidak terhubung');
    return false;
  }

  const msg = command.toUpperCase(); // "ON" atau "OFF"
  client.publish(TOPICS.SET, msg, { qos: 1 }, (err) => {
    if (err) {
      console.error('❌ Gagal publish ke', TOPICS.SET, ':', err);
    } else {
      console.log(`📤 Publish ke ${TOPICS.SET}: ${msg}`);
      latestData.peltierOn = msg === 'ON' || msg === '1';
    }
  });

  return true;
}

// ─── SSE (Server-Sent Events) Management ─────────────────────
function addSSEClient(res) {
  sseClients.add(res);
  console.log(`👤 SSE client terhubung (total: ${sseClients.size})`);

  res.on('close', () => {
    sseClients.delete(res);
    console.log(`👤 SSE client disconnect (total: ${sseClients.size})`);
  });

  // Kirim data terbaru segera
  sendSSE(res, latestData);

  // Kirim status MQTT saat ini
  const status = mqttConnected ? 'connected' : 'error';
  try {
    res.write(`event: mqtt_status\ndata: ${JSON.stringify({ _mqttStatus: status })}\n\n`);
  } catch (_) { /* ignore */ }
}

function sendSSE(res, data) {
  try {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (err) {
    // Client mungkin sudah disconnect
    sseClients.delete(res);
  }
}

function broadcastSSE(data) {
  for (const c of sseClients) {
    sendSSE(c, data);
  }
}

// ─── Getter ──────────────────────────────────────────────────
function getLatestData() {
  return { ...latestData };
}

function isConnected() {
  return mqttConnected;
}

module.exports = {
  connectMQTT,
  publishControl,
  addSSEClient,
  getLatestData,
  isConnected,
  TOPICS,
};

