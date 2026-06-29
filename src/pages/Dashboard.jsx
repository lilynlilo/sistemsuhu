import { motion } from 'framer-motion';
import { Clock, RefreshCw, Activity, Power, Wifi, WifiOff } from 'lucide-react';
import { useSensor } from '../context/SensorContext';
import SensorCard from '../components/ui/SensorCard';
import PeltierStatus from '../components/ui/PeltierStatus';
import ThresholdCard from '../components/ui/ThresholdCard';
import TemperatureChart from '../components/charts/TemperatureChart';
import { useState, useEffect } from 'react';

function StatBadge({ label, value, color }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-secondary)' }}>
      <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-bold text-sm" style={{ color }}>{value}</p>
    </div>
  );
}

function MqttStatusBadge({ status }) {
  const configs = {
    connected: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', label: 'Realtime Terhubung', icon: Wifi },
    connecting: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Menghubungkan...', icon: Wifi },
    error: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Realtime Terputus', icon: WifiOff },
  };
  const cfg = configs[status] || configs.connecting;
  const Icon = cfg.icon;

  return (
    <span
      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function Dashboard() {
  const { latest, chartData, threshold, isLoading, mqttStatus, getWaterStatus, getEnvStatus, controlPeltier } = useSensor();
  const [now, setNow] = useState(new Date());
  const [controlling, setControlling] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const waterStatus = getWaterStatus();
  const envStatus = getEnvStatus();

  // Hitung statistik dari chartData
  const waterTemps = chartData.map(d => d.waterTemp).filter(Boolean);
  const envTemps = chartData.map(d => d.envTemp).filter(Boolean);
  const avgWater = waterTemps.length ? (waterTemps.reduce((a, b) => a + b, 0) / waterTemps.length).toFixed(1) : '--';
  const avgEnv = envTemps.length ? (envTemps.reduce((a, b) => a + b, 0) / envTemps.length).toFixed(1) : '--';
  const maxWater = waterTemps.length ? Math.max(...waterTemps).toFixed(1) : '--';
  const minWater = waterTemps.length ? Math.min(...waterTemps).toFixed(1) : '--';

  const handleControl = async (command) => {
    setControlling(true);
    try {
      await controlPeltier(command);
    } catch (err) {
      console.error('Gagal kontrol:', err);
    } finally {
      setTimeout(() => setControlling(false), 1000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Memuat data sensor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            Data real-time dari Arduino via Supabase
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MqttStatusBadge status={mqttStatus} />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--bg-secondary)' }}>
            <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              {now.toLocaleTimeString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Sensor Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SensorCard
          type="water"
          label="Suhu Air Hidroponik"
          value={latest?.waterTemp}
          status={waterStatus}
          minTemp={threshold.waterMin}
          maxTemp={threshold.waterMax}
        />
        <SensorCard
          type="env"
          label="Suhu Lingkungan Greenhouse"
          value={latest?.envTemp}
          status={envStatus}
          minTemp={threshold.envMin}
          maxTemp={threshold.envMax}
        />
        <PeltierStatus isOn={latest?.peltierOn ?? false} />
        <ThresholdCard threshold={threshold} />
      </div>

      {/* ── Kontrol Peltier Manual ── */}
      <motion.div
        className="card p-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.1)' }}
            >
              <Power className="w-5 h-5" style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Kontrol Manual Peltier
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Kirim perintah ON/OFF peltier
              </p>
            </div>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{
              background: latest?.peltierOn ? 'rgba(239,68,68,0.1)' : 'rgba(148,163,184,0.1)',
              color: latest?.peltierOn ? '#ef4444' : 'var(--text-muted)',
            }}
          >
            {latest?.peltierOn ? '● AKTIF' : '○ NONAKTIF'}
          </span>
        </div>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleControl('ON')}
            disabled={controlling}
            id="peltier-on-btn"
            className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-all"
            style={{
              background: controlling ? '#86efac' : 'linear-gradient(135deg, #22c55e, #16a34a)',
              boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
              opacity: controlling ? 0.7 : 1,
            }}
          >
            {controlling ? 'Mengirim...' : 'Nyalakan Peltier'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleControl('OFF')}
            disabled={controlling}
            id="peltier-off-btn"
            className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-all"
            style={{
              background: controlling ? '#fca5a5' : 'linear-gradient(135deg, #f87171, #ef4444)',
              boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
              opacity: controlling ? 0.7 : 1,
            }}
          >
            {controlling ? 'Mengirim...' : 'Matikan Peltier'}
          </motion.button>
        </div>

        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          Kontrol otomatis tetap berjalan (Peltier ON jika suhu air {'>'} 29°C).
        </p>
      </motion.div>

      {/* ── Stats Row ── */}
      <motion.div
        className="card p-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Statistik Sesi (50 Pembacaan Terakhir)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBadge label="Rerata suhu Air" value={`${avgWater}°C`} color="var(--accent)" />
          <StatBadge label="Rerata suhu GH" value={`${avgEnv}°C`} color="#3b44f6ff" />
          <StatBadge label="Maks suhu Air" value={`${maxWater}°C`} color="#3b44f6ff" />
          <StatBadge label="Minim suhu Air" value={`${minWater}°C`} color="#22c55e" />
        </div>
      </motion.div>

      {/* ── Realtime Chart ── */}
      <motion.div
        className="card p-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Grafik Real-time
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>50 data poin terakhir dari Arduino</p>
          </div>
          <span
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--accent)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
            LIVE
          </span>
        </div>
        <TemperatureChart
          data={chartData}
          threshold={threshold}
          showEnv={true}
          height={260}
        />
      </motion.div>
    </div>
  );
}
