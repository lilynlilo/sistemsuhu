// ─── Mock API untuk simulasi data sensor ─────────────────────
const BASE_WATER_TEMP = 26;
const BASE_ENV_TEMP   = 30;

let currentWaterTemp = BASE_WATER_TEMP;
let currentEnvTemp   = BASE_ENV_TEMP;

function randomDelta(range = 0.5) {
  return (Math.random() - 0.5) * range * 2;
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

// Simulasi fluktuasi suhu realistis
export function getLatestReading(threshold = { min: 22, max: 28 }) {
  currentWaterTemp = clamp(currentWaterTemp + randomDelta(0.4), 18, 38);
  currentEnvTemp   = clamp(currentEnvTemp   + randomDelta(0.6), 20, 42);

  const peltierOn = currentWaterTemp > threshold.max;

  return {
    timestamp:    new Date().toISOString(),
    waterTemp:    parseFloat(currentWaterTemp.toFixed(1)),
    envTemp:      parseFloat(currentEnvTemp.toFixed(1)),
    peltierOn,
    threshold,
  };
}

// Generate data history untuk tanggal tertentu
export function getHistoryData(startDate, endDate) {
  const result = [];
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate || startDate);
  end.setHours(23, 59, 59, 999);

  const threshold = { min: 22, max: 28 };

  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    let wTemp = BASE_WATER_TEMP + randomDelta(2);
    let eTemp = BASE_ENV_TEMP   + randomDelta(3);

    // 1 titik data per 30 menit = 48 titik per hari
    for (let i = 0; i < 48; i++) {
      const time = new Date(current.getTime() + i * 30 * 60 * 1000);
      // Hindari membuat data ke masa depan jika melewati jam sekarang untuk hari yg sama
      if (time > new Date()) continue;
      
      wTemp = clamp(wTemp + randomDelta(0.5), 18, 38);
      eTemp = clamp(eTemp + randomDelta(0.7), 20, 42);

      const dayStr = time.getDate().toString().padStart(2, '0');
      const monStr = (time.getMonth() + 1).toString().padStart(2, '0');
      const hrStr = time.getHours().toString().padStart(2, '0');
      const minStr = time.getMinutes().toString().padStart(2, '0');

      result.push({
        timestamp:  time.toISOString(),
        time:       `${dayStr}/${monStr} ${hrStr}:${minStr}`,
        waterTemp:  parseFloat(wTemp.toFixed(1)),
        envTemp:    parseFloat(eTemp.toFixed(1)),
        peltierOn:  wTemp > threshold.max,
      });
    }
  }

  return result;
}

// Ambil data realtime chart (50 titik terakhir)
export function getRealtimeBuffer(count = 50) {
  const result = [];
  let wTemp = BASE_WATER_TEMP + randomDelta(2);
  let eTemp = BASE_ENV_TEMP   + randomDelta(3);

  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    const time = new Date(now - i * 3000);
    wTemp = clamp(wTemp + randomDelta(0.4), 18, 38);
    eTemp = clamp(eTemp + randomDelta(0.6), 20, 42);

    result.push({
      time:      time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      waterTemp: parseFloat(wTemp.toFixed(1)),
      envTemp:   parseFloat(eTemp.toFixed(1)),
    });
  }
  return result;
}
