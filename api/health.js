const { supabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { count, error } = await supabase
      .from('sensor_readings')
      .select('*', { count: 'exact', head: true });

    if (error) throw new Error(error.message);

    res.status(200).json({
      status: 'ok',
      database: 'supabase',
      totalReadings: count || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
