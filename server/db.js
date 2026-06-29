require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function initDatabase() {
  console.log('✅ Supabase client siap:', process.env.SUPABASE_URL);
}

const insertReading = () => {
  return async (waterTemp, envTemp, peltierOn) => {
    const { data, error } = await supabase
      .from('sensor_readings')
      .insert({ water_temp: waterTemp, env_temp: envTemp, peltier_on: peltierOn })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  };
};

async function getLatest() {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .order('id', { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data;
}

async function getRecentReadings(count = 50) {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .order('id', { ascending: false })
    .limit(count);
  if (error) throw new Error(error.message);
  return (data || []).reverse();
}

async function getHistory(startDate, endDate) {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .gte('timestamp', startDate)
    .lte('timestamp', endDate)
    .order('timestamp', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

async function getStats(startDate, endDate) {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('water_temp, env_temp, peltier_on')
    .gte('timestamp', startDate)
    .lte('timestamp', endDate);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    return {
      total_readings: 0,
      avg_water_temp: 0,
      avg_env_temp: 0,
      min_water_temp: 0,
      max_water_temp: 0,
      min_env_temp: 0,
      max_env_temp: 0,
      peltier_on_count: 0,
    };
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

  return {
    total_readings: data.length,
    avg_water_temp: +(sumWater / data.length).toFixed(1),
    avg_env_temp: +(sumEnv / data.length).toFixed(1),
    min_water_temp: +minWater.toFixed(1),
    max_water_temp: +maxWater.toFixed(1),
    min_env_temp: +minEnv.toFixed(1),
    max_env_temp: +maxEnv.toFixed(1),
    peltier_on_count: peltierCount,
  };
}

async function getTotalCount() {
  const { count, error } = await supabase
    .from('sensor_readings')
    .select('*', { count: 'exact', head: true });
  if (error) return { count: 0 };
  return { count: count || 0 };
}

async function insertCommand(command) {
  const { data, error } = await supabase
    .from('peltier_commands')
    .insert({ command })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

module.exports = {
  initDatabase,
  insertReading,
  getLatest,
  getRecentReadings,
  getHistory,
  getStats,
  getTotalCount,
  insertCommand,
};
