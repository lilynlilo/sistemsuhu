const { supabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { start, end } = req.query;

    if (!start) {
      return res.status(400).json({ error: 'Parameter "start" wajib diisi (format: YYYY-MM-DD)' });
    }

    const startDate = `${start} 00:00:00`;
    const endDate = end ? `${end} 23:59:59` : `${start} 23:59:59`;

    // Fetch data (ditambah limit 100000 agar tidak terpotong default 1000 baris dari Supabase)
    const { data: history, error: historyError } = await supabase
      .from('sensor_readings')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: true })
      .limit(100000);

    if (historyError) throw new Error(historyError.message);

    // Calculate stats
    const rows = history || [];
    let stats = {
      total_readings: 0,
      avg_water_temp: 0, avg_env_temp: 0,
      min_water_temp: 0, max_water_temp: 0,
      min_env_temp: 0, max_env_temp: 0,
      peltier_on_count: 0,
    };

    if (rows.length > 0) {
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

      stats = {
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

    res.status(200).json({ data: rows, stats, range: { start: startDate, end: endDate } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
