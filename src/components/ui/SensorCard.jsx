import { motion } from 'framer-motion';
import { Thermometer, Droplets, Wind, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const STATUS_CONFIG = {
  normal: {
    label:     'Normal',
    labelColor: '#22c55e',
    cardGlow:  'rgba(34,197,94,0.12)',
    badgeBg:   'rgba(34,197,94,0.15)',
    icon:      Minus,
    iconColor: '#22c55e',
    ring:      '#22c55e',
  },
  high: {
    label:     'Suhu Tinggi',
    labelColor: '#ef4444',
    cardGlow:  'rgba(239,68,68,0.12)',
    badgeBg:   'rgba(239,68,68,0.15)',
    icon:      TrendingUp,
    iconColor: '#ef4444',
    ring:      '#ef4444',
  },
  cooling: {
    label:     'Pendinginan Aktif',
    labelColor: '#ef4444',
    cardGlow:  'rgba(239,68,68,0.12)',
    badgeBg:   'rgba(239,68,68,0.15)',
    icon:      TrendingDown,
    iconColor: '#ef4444',
    ring:      '#ef4444',
  },
};

const SENSOR_ICON = {
  water: Droplets,
  env:   Wind,
};

export default function SensorCard({ type = 'water', label, value, unit = '°C', status = 'normal', minTemp, maxTemp }) {
  const cfg        = STATUS_CONFIG[status] || STATUS_CONFIG.normal;
  const StatusIcon = cfg.icon;
  const SensorIcon = SENSOR_ICON[type] || Thermometer;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.4 }}
      className="card p-6 relative overflow-hidden"
      style={{ boxShadow: `0 4px 20px ${cfg.cardGlow}, var(--shadow-md)` }}
    >
      {/* Background decoration */}
      <div
        className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-10"
        style={{ background: cfg.ring }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            {label}
          </p>
          {/* Status Badge */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: cfg.badgeBg, color: cfg.labelColor }}
          >
            <StatusIcon className="w-3 h-3" />
            {cfg.label}
          </span>
        </div>

        {/* Sensor Icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: cfg.badgeBg }}
        >
          <SensorIcon className="w-6 h-6" style={{ color: cfg.iconColor }} />
        </div>
      </div>

      {/* Value */}
      <div className="flex items-end gap-2 mb-4">
        <motion.span
          key={value}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="text-5xl font-extrabold font-mono leading-none"
          style={{ color: cfg.labelColor }}
        >
          {value ?? '--'}
        </motion.span>
        <span className="text-xl font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
          {unit}
        </span>
      </div>

      {/* Threshold Range Bar */}
      {minTemp !== undefined && maxTemp !== undefined && value !== undefined && (
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Min {minTemp}°C</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Max {maxTemp}°C</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: cfg.ring }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, ((value - minTemp) / (maxTemp - minTemp)) * 100))}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Pulse ring saat status kritis */}
      {(status === 'high' || status === 'cooling') && (
        <div
          className="absolute inset-0 rounded-2xl border-2 pointer-events-none"
          style={{
            borderColor: cfg.ring,
            animation: 'pulseRing 2s ease-out infinite',
            opacity: 0.4,
          }}
        />
      )}
    </motion.div>
  );
}
