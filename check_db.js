import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('sensor_readings')
  .select('id, timestamp, water_temp, env_temp, peltier_on')
  .order('id', { ascending: false })
  .limit(10);

if (error) {
  console.error('Error:', error);
} else {
  console.log('=== Latest 10 records ===');
  console.log('Current UTC:', new Date().toISOString());
  console.log('Current WIB:', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));
  console.log('');
  data.forEach(row => {
    const ts = new Date(row.timestamp);
    const wib = ts.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    console.log(`ID:${row.id} | Raw:${row.timestamp} | AsWIB:${wib} | W:${row.water_temp} E:${row.env_temp}`);
  });

  const { count } = await supabase
    .from('sensor_readings')
    .select('*', { count: 'exact', head: true });
  console.log('\nTotal records:', count);
}
