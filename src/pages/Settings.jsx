import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Save, RotateCcw, CheckCircle2, AlertTriangle, Droplets, Wind } from 'lucide-react';
import { useSensor } from '../context/SensorContext';

function NumberInput({ label, value, min, max, step = 0.5, onChange, color = 'var(--accent)' }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium block" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => {
            const val = e.target.value === '' ? '' : parseFloat(e.target.value);
            onChange(val);
          }}
          onBlur={e => {
            let val = parseFloat(e.target.value);
            if (isNaN(val)) val = min;
            else if (val < min) val = min;
            else if (val > max) val = max;
            onChange(val);
          }}
          className="w-full p-2.5 rounded-xl border text-base font-mono font-bold transition-all focus:outline-none focus:ring-2 focus:ring-opacity-50"
          style={{ 
            background: 'var(--bg-secondary)', 
            color: color,
            borderColor: 'var(--border-color)',
            '--tw-ring-color': color
          }}
        />
        <span className="text-base font-bold font-mono px-3 py-2.5 rounded-xl border flex-shrink-0" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
          °C
        </span>
      </div>
      <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>Min: {min}°C</span>
        <span>Max: {max}°C</span>
      </div>
    </div>
  );
}

export default function Settings() {
  const { threshold, updateThreshold } = useSensor();
  const [form, setForm] = useState({
    waterMin: threshold.waterMin ?? threshold.min ?? 22,
    waterMax: threshold.waterMax ?? threshold.max ?? 28,
    envMin: threshold.envMin ?? 25,
    envMax: threshold.envMax ?? 35,
  });
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  const handleSave = () => {
    if (form.waterMin >= form.waterMax) {
      setError('Suhu minimum air harus lebih kecil dari suhu maksimum air!');
      return;
    }
    if (form.envMin >= form.envMax) {
      setError('Suhu minimum greenhouse harus lebih kecil dari suhu maksimum greenhouse!');
      return;
    }
    setError('');
    updateThreshold({
      waterMin: form.waterMin,
      waterMax: form.waterMax,
      envMin: form.envMin,
      envMax: form.envMax,
      min: form.waterMin, // compatibility fallback
      max: form.waterMax  // compatibility fallback
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    const defaults = {
      waterMin: 22,
      waterMax: 28,
      envMin: 25,
      envMax: 35,
      min: 22,
      max: 28
    };
    setForm({
      waterMin: defaults.waterMin,
      waterMax: defaults.waterMax,
      envMin: defaults.envMin,
      envMax: defaults.envMax,
    });
    updateThreshold(defaults);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Header Page ── */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
          <SettingsIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h2 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            Konfigurasi Batasan Suhu (Threshold)
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Atur ambang batas suhu air hidroponik dan suhu lingkungan greenhouse
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── 1. Suhu Air Threshold ── */}
        <motion.div
          className="card p-6 flex flex-col justify-between"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <div>
            <div className="flex items-center gap-2 mb-6 pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <Droplets className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                Batasan Suhu Air
              </h3>
            </div>

            <div className="space-y-6">
              <NumberInput
                label="Suhu Minimum Air (Peltier OFF)"
                value={form.waterMin}
                min={15}
                max={30}
                onChange={v => setForm(p => ({ ...p, waterMin: v }))}
                color="#22c55e"
              />
              <NumberInput
                label="Suhu Maksimum Air (Peltier ON)"
                value={form.waterMax}
                min={20}
                max={45}
                onChange={v => setForm(p => ({ ...p, waterMax: v }))}
                color="#ef4444"
              />
            </div>
          </div>

          {/* Preview Air */}
          <div className="rounded-xl p-4 border mt-6" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>PREVIEW LOGIKA AIR</p>
            <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
                Suhu air &lt; {form.waterMax}°C → Peltier <strong>OFF</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
                Suhu air ≥ {form.waterMax}°C → Peltier <strong>ON</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
                Rentang target: {form.waterMin}°C — {form.waterMax}°C
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── 2. Suhu Greenhouse Threshold ── */}
        <motion.div
          className="card p-6 flex flex-col justify-between"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div>
            <div className="flex items-center gap-2 mb-6 pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <Wind className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                Batasan Suhu Greenhouse
              </h3>
            </div>

            <div className="space-y-6">
              <NumberInput
                label="Suhu Minimum Greenhouse"
                value={form.envMin}
                min={15}
                max={35}
                onChange={v => setForm(p => ({ ...p, envMin: v }))}
                color="#22c55e"
              />
              <NumberInput
                label="Suhu Maksimum Greenhouse"
                value={form.envMax}
                min={20}
                max={50}
                onChange={v => setForm(p => ({ ...p, envMax: v }))}
                color="#ef4444"
              />
            </div>
          </div>

          {/* Preview Greenhouse */}
          <div className="rounded-xl p-4 border mt-6" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>PREVIEW LOGIKA GREENHOUSE</p>
            <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
                Suhu &le; {form.envMax}°C → Status <strong>Normal</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
                Suhu &gt; {form.envMax}°C → Status <strong>Suhu Tinggi</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
                Rentang target: {form.envMin}°C — {form.envMax}°C
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Error & Success Notifications ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-xl text-sm text-yellow-500"
          style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </motion.div>
      )}

      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Pengaturan berhasil disimpan!
        </motion.div>
      )}

      {/* ── Action Buttons ── */}
      <div className="flex gap-3 pt-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          id="settings-save"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover, #16a34a))', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}
        >
          <Save className="w-4 h-4" />
          Simpan Semua Pengaturan
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleReset}
          id="settings-reset"
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border"
          style={{
            borderColor: 'var(--border-color)',
            color:       'var(--text-secondary)',
            background:  'var(--bg-secondary)',
          }}
        >
          <RotateCcw className="w-4 h-4" />
          Reset Default
        </motion.button>
      </div>
    </div>
  );
}
