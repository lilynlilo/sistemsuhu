const { supabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { start, end, limit: limitParam, interval: intervalParam } = req.query;

    // Default: ambil 100 data terbaru dengan interval 30 detik
    const maxRows = Math.min(parseInt(limitParam) || 100, 500);
    const intervalSec = parseInt(intervalParam) || 30;

    // ─── Mode 1: Tanpa parameter start → ambil N data terbaru tersampling ───
    if (!start) {
      // Ambil data mentah terbaru (cukup banyak untuk di-sampling)
      // Untuk interval 30 detik dan 100 baris, butuh ~3000 detik = 50 menit data
      // Ambil lebih banyak untuk safety margin
      const rawLimit = maxRows * intervalSec; // misal 100 * 30 = 3000 data mentah
      const { data: rawData, error: rawError } = await supabase
        .from('sensor_readings')
        .select('id, timestamp, water_temp, env_temp, peltier_on')
        .order('timestamp', { ascending: false })
        .limit(Math.min(rawLimit, 5000));

      if (rawError) throw new Error(rawError.message);

      const rows = (rawData || []).reverse(); // urutkan ascending
      const sampled = sampleByInterval(rows, intervalSec);
      const result = sampled.slice(-maxRows); // ambil N terakhir

      const stats = calculateStats(result);

      return res.status(200).json({
        data: result,
        stats,
        info: {
          total_raw: rows.length,
          sampled_count: result.length,
          interval_seconds: intervalSec,
          mode: 'latest',
        },
      });
    }

    // ─── Mode 2: Dengan parameter start (dan optional end) → range tanggal ───
    const startDate = `${start} 00:00:00`;
    const endDate = end ? `${end} 23:59:59` : `${start} 23:59:59`;

    // Ambil data mentah dalam range (limit 5000 agar tidak terlalu berat)
    const { data: rawData, error: rawError } = await supabase
      .from('sensor_readings')
      .select('id, timestamp, water_temp, env_temp, peltier_on')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: true })
      .limit(5000);

    if (rawError) throw new Error(rawError.message);

    const rows = rawData || [];
    const sampled = sampleByInterval(rows, intervalSec);
    const result = sampled.slice(-maxRows);
    const stats = calculateStats(result);

    return res.status(200).json({
      data: result,
      stats,
      info: {
        total_raw: rows.length,
        sampled_count: result.length,
        interval_seconds: intervalSec,
        mode: 'range',
        range: { start: startDate, end: endDate },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Filter data agar hanya menyisakan 1 data per interval detik.
 * Mengambil data pertama di setiap kelipatan interval.
 */
function sampleByInterval(rows, intervalSec) {
  if (!rows || rows.length === 0) return [];

  const result = [];
  let lastTimestamp = 0;

  for (const row of rows) {
    const ts = new Date(row.timestamp).getTime();
    if (ts - lastTimestamp >= intervalSec * 1000) {
      result.push(row);
      lastTimestamp = ts;
    }
  }

  return result;
}

/**
 * Hitung statistik dari array data yang sudah di-sampling.
 */
function calculateStats(rows) {
  if (!rows || rows.length === 0) {
    return {
      total_readings: 0,
      avg_water_temp: 0, avg_env_temp: 0,
      min_water_temp: 0, max_water_temp: 0,
      min_env_temp: 0, max_env_temp: 0,
      peltier_on_count: 0,
    };
  }

  let sumWater = 0, sumEnv = 0, peltierCount = 0;
  let minWater = Infinity, maxWater = -Infinity;
  let minEnv = Infinity, maxEnv = -Infinity;

  for (const r of rows) {
    sumWater += r.water_temp;
    sumEnv += r.env_temp;
    if (r.water_temp < minWater) minWater = r.water_temp;
    if (r.water_temp > maxWater) maxWater = r.water_temp;
    if (r.env_temp < minEnv) minEnv = r.env_temp;
    if (r.env_temp > maxEnv) maxEnv = r.env_temp;
    if (r.peltier_on) peltierCount++;
  }

  return {
    total_readings: rows.length,
    avg_water_temp: +(sumWater / rows.length).toFixed(1),
    avg_env_temp: +(sumEnv / rows.length).toFixed(1),
    min_water_temp: +minWater.toFixed(1),
    max_water_temp: +maxWater.toFixed(1),
    min_env_temp: +minEnv.toFixed(1),
    max_env_temp: +maxEnv.toFixed(1),
    peltier_on_count: peltierCount,
  };
}
