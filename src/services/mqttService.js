// ─── MQTT Service: Komunikasi Frontend ↔ Backend ──────────────
const API_BASE = '/api';

// ═══════════════════════════════════════════════════════════════
// SSE (Server-Sent Events) untuk Data Real-time
// ═══════════════════════════════════════════════════════════════

/**
 * Buka koneksi SSE ke backend untuk menerima data sensor real-time.
 * Koneksi akan otomatis reconnect jika terputus.
 * @param {Function} onData - Callback dipanggil setiap ada data baru
 * @param {Function} onError - Callback dipanggil jika ada error
 * @param {Function} onMqttStatus - Callback dipanggil saat status MQTT berubah (opsional)
 * @returns {EventSource} - Instance EventSource (panggil .close() untuk disconnect)
 */
export function connectSSE(onData, onError, onMqttStatus) {
  let es = null;
  let closed = false;

  function connect() {
    es = new EventSource(`${API_BASE}/sse`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onData(data);
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    // Listen for named 'mqtt_status' event dari server
    es.addEventListener('mqtt_status', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMqttStatus && data._mqttStatus) {
          onMqttStatus(data._mqttStatus);
        }
      } catch (err) {
        console.error('SSE mqtt_status parse error:', err);
      }
    });

    es.onerror = (err) => {
      console.error('SSE connection error:', err);
      if (onError) onError(err);

      // Auto-reconnect setelah 3 detik jika koneksi putus
      if (!closed && es.readyState === EventSource.CLOSED) {
        console.log('🔄 SSE reconnecting in 3s...');
        setTimeout(() => {
          if (!closed) connect();
        }, 3000);
      }
    };
  }

  connect();

  // Return objek dengan close() method
  return {
    close() {
      closed = true;
      if (es) es.close();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// REST API Calls
// ═══════════════════════════════════════════════════════════════

/**
 * Ambil data sensor terbaru
 */
export async function fetchLatest() {
  const res = await fetch(`${API_BASE}/latest`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Ambil data pembacaan terakhir (untuk chart realtime)
 * @param {number} count - Jumlah data (default 50)
 */
export async function fetchRecent(count = 50) {
  const res = await fetch(`${API_BASE}/recent?count=${count}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Ambil data history berdasarkan tanggal
 * @param {string} startDate - Format: YYYY-MM-DD
 * @param {string} endDate - Format: YYYY-MM-DD (opsional)
 */
export async function fetchHistory(startDate, endDate) {
  let url = `${API_BASE}/history?start=${startDate}`;
  if (endDate) url += `&end=${endDate}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Ambil statistik sensor
 * @param {string} startDate - Format: YYYY-MM-DD
 * @param {string} endDate - Format: YYYY-MM-DD (opsional)
 */
export async function fetchStats(startDate, endDate) {
  let url = `${API_BASE}/stats?start=${startDate}`;
  if (endDate) url += `&end=${endDate}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Kirim perintah kontrol Peltier ke Arduino via MQTT
 * @param {'ON'|'OFF'|'1'|'0'} command
 */
export async function sendControl(command) {
  const res = await fetch(`${API_BASE}/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Cek status kesehatan backend
 */
export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
