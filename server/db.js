const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'hydrocontrol_db.json');

let db = {
  sensor_readings: []
};

// Auto-increment ID
let nextId = 1;

function saveToDisk() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Gagal menyimpan ke file JSON:', err);
  }
}

function initDatabase() {
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      db = JSON.parse(data);
      if (db.sensor_readings.length > 0) {
        nextId = db.sensor_readings[db.sensor_readings.length - 1].id + 1;
      }
    } catch (err) {
      console.error('Gagal membaca file JSON, membuat baru.', err);
      db = { sensor_readings: [] };
    }
  } else {
    saveToDisk();
  }
  console.log('✅ Database JSON siap:', DB_PATH);
  return db;
}

const insertReading = () => {
  return (waterTemp, envTemp, peltierOn) => {
    // timestamp: YYYY-MM-DD HH:MM:SS
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    
    const reading = {
      id: nextId++,
      timestamp,
      water_temp: waterTemp,
      env_temp: envTemp,
      peltier_on: peltierOn ? 1 : 0
    };
    
    db.sensor_readings.push(reading);
    saveToDisk();
    return reading;
  };
};

function getLatest() {
  if (db.sensor_readings.length === 0) return null;
  return db.sensor_readings[db.sensor_readings.length - 1];
}

function getRecentReadings(count = 50) {
  // Get last 'count' items, but the original code reversed them (latest first? wait original was ORDER BY id DESC then reverse() which means oldest to newest of the last count)
  // SQLite: ORDER BY id DESC LIMIT count -> gets newest N, then reverse() -> oldest to newest of those N.
  const recent = db.sensor_readings.slice(-count);
  return recent;
}

function getHistory(startDate, endDate) {
  return db.sensor_readings.filter(r => {
    return r.timestamp >= startDate && r.timestamp <= endDate;
  });
}

function getStats(startDate, endDate) {
  const filtered = db.sensor_readings.filter(r => {
    return r.timestamp >= startDate && r.timestamp <= endDate;
  });

  if (filtered.length === 0) {
    return {
      total_readings: 0,
      avg_water_temp: 0,
      avg_env_temp: 0,
      min_water_temp: 0,
      max_water_temp: 0,
      min_env_temp: 0,
      max_env_temp: 0,
      peltier_on_count: 0
    };
  }

  let sumWater = 0, sumEnv = 0, peltierCount = 0;
  let minWater = Infinity, maxWater = -Infinity;
  let minEnv = Infinity, maxEnv = -Infinity;

  for (const r of filtered) {
    sumWater += r.water_temp;
    sumEnv += r.env_temp;
    if (r.water_temp < minWater) minWater = r.water_temp;
    if (r.water_temp > maxWater) maxWater = r.water_temp;
    if (r.env_temp < minEnv) minEnv = r.env_temp;
    if (r.env_temp > maxEnv) maxEnv = r.env_temp;
    if (r.peltier_on === 1) peltierCount++;
  }

  return {
    total_readings: filtered.length,
    avg_water_temp: +(sumWater / filtered.length).toFixed(1),
    avg_env_temp: +(sumEnv / filtered.length).toFixed(1),
    min_water_temp: +(minWater).toFixed(1),
    max_water_temp: +(maxWater).toFixed(1),
    min_env_temp: +(minEnv).toFixed(1),
    max_env_temp: +(maxEnv).toFixed(1),
    peltier_on_count: peltierCount
  };
}

function getTotalCount() {
  return { count: db.sensor_readings.length };
}

module.exports = {
  initDatabase,
  insertReading,
  getLatest,
  getRecentReadings,
  getHistory,
  getStats,
  getTotalCount,
};
