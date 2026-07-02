import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Query for any future records
const nowUtc = new Date().toISOString();
console.log('Now UTC:', nowUtc);

const { data: futureData, error: err1 } = await supabase
  .from('sensor_readings')
  .select('id, timestamp, water_temp, env_temp')
  .gt('timestamp', nowUtc)
  .order('timestamp', { ascending: false });

if (err1) {
  console.error('Error fetching future data:', err1);
} else {
  console.log(`Found ${futureData.length} records in the future:`);
  futureData.slice(0, 10).forEach(row => {
    console.log(`ID: ${row.id} | Timestamp: ${row.timestamp} | Water: ${row.water_temp}`);
  });
}

// Let's also check the actual raw timestamps of the top 100 rows being fetched by the API
const { data: rawData, error: err2 } = await supabase
  .from('sensor_readings')
  .select('id, timestamp, water_temp, env_temp')
  .order('timestamp', { ascending: false })
  .limit(100);

if (err2) {
  console.error('Error fetching latest 100:', err2);
} else {
  console.log('\nLatest 10 raw timestamps in database (ordered by timestamp desc):');
  rawData.slice(0, 10).forEach(row => {
    const ts = new Date(row.timestamp);
    const wib = ts.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    console.log(`ID: ${row.id} | Raw: ${row.timestamp} | WIB: ${wib}`);
  });
}
