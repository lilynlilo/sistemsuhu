const { supabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { data, error } = await supabase
      .from('sensor_readings')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (error) return res.status(200).json({ stored: null });

    res.status(200).json({ stored: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
