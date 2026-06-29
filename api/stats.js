const { supabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { start, end } = req.query;
    const now = new Date();
    const startDate = start || now.toISOString().split('T')[0];
    const endDate = end || startDate;

    const { data, error } = await supabase
      .from('sensor_readings')
      .select('water_temp, env_temp, peltier_on')
      .gte('timestamp', `${startDate} 00:00:00`)
      .lte('timestamp', `${endDate} 23:59:59`);

    if (error) throw new Error(error.message);

    if (!data || data.length === 0) {
      return res.status(200).json({
        total_readings: 0,
        avg_water_temp: 0, avg_env_temp: 0,
        min_water_temp: 0, max_water_temp: 0,
        min_env_temp: 0, max_env_temp: 0,
        peltier_on_count: 0,
      });
    }

    let sumWater = 0, sumEnv = 0, peltierCount = 0;
    let minWater = Infinity, maxWater = -Infinity;
    let minEnv = Infinity, maxEnv = -Infinity;

    for (const r of data) {
      sumWater += r.water_temp;
      sumEnv += r.env_temp;
      if (r.water_temp < minWater) minWater = r.water_temp;
      if (r.water_temp > maxWater) maxWater = r.water_temp;
      if (r.env_temp < minEnv) minEnv = r.env_temp;
      if (r.env_temp > maxEnv) maxEnv = r.env_temp;
      if (r.peltier_on) peltierCount++;
    }

    res.status(200).json({
      total_readings: data.length,
      avg_water_temp: +(sumWater / data.length).toFixed(1),
      avg_env_temp: +(sumEnv / data.length).toFixed(1),
      min_water_temp: +minWater.toFixed(1),
      max_water_temp: +maxWater.toFixed(1),
      min_env_temp: +minEnv.toFixed(1),
      max_env_temp: +maxEnv.toFixed(1),
      peltier_on_count: peltierCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
