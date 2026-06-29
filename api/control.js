const { supabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Parameter "command" wajib diisi (ON/OFF)' });
    }

    const cmd = command.toString().toUpperCase();
    const normalizedCmd = cmd === '1' ? 'ON' : cmd === '0' ? 'OFF' : cmd;

    if (!['ON', 'OFF'].includes(normalizedCmd)) {
      return res.status(400).json({ error: 'Command tidak valid. Gunakan: ON atau OFF' });
    }

    const { data, error } = await supabase
      .from('peltier_commands')
      .insert({ command: normalizedCmd })
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.status(200).json({
      status: 'ok',
      message: `Perintah "${normalizedCmd}" dikirim ke Arduino`,
      command: normalizedCmd,
      id: data.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
