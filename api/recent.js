const { supabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const count = Math.min(parseInt(req.query.count) || 50, 200);

    const { data, error } = await supabase
      .from('sensor_readings')
      .select('*')
      .order('id', { ascending: false })
      .limit(count);

    if (error) throw new Error(error.message);

    res.status(200).json((data || []).reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
