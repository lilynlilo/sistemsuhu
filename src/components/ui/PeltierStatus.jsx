import { motion } from 'framer-motion';
import { Zap, ZapOff } from 'lucide-react';

export default function PeltierStatus({ isOn = false }) {
  return (
    <motion.div
      className="card p-6 relative overflow-hidden"
      style={{
        boxShadow: isOn
          ? '0 4px 20px rgba(239,68,68,0.2), var(--shadow-md)'
          : 'var(--shadow-md)',
      }}
      animate={{ scale: [1, 1.005, 1] }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Background deco */}
      <div
        className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-10"
        style={{ background: isOn ? '#ef4444' : 'var(--text-muted)' }}
      />

      <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
        Status Peltier (Pendingin)
      </p>

      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: isOn ? 'rgba(239,68,68,0.15)' : 'var(--bg-secondary)',
          }}
        >
          {isOn ? (
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Zap className="w-8 h-8" style={{ color: '#ef4444' }} />
            </motion.div>
          ) : (
            <ZapOff className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
          )}
        </div>

        {/* Status Text */}
        <div>
          <motion.div
            key={String(isOn)}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2 mb-1"
          >
            {/* Dot */}
            <span className="relative flex h-3 w-3">
              {isOn && (
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: '#ef4444' }}
                />
              )}
              <span
                className="relative inline-flex rounded-full h-3 w-3"
                style={{ background: isOn ? '#ef4444' : '#94a3b8' }}
              />
            </span>
            <span
              className="text-3xl font-extrabold"
              style={{ color: isOn ? '#ef4444' : 'var(--text-muted)' }}
            >
              {isOn ? 'ON' : 'OFF'}
            </span>
          </motion.div>

          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isOn ? 'Pendinginan sedang aktif' : 'Sistem pendingin standby'}
          </p>
        </div>
      </div>

      {/* Glow border saat ON */}
      {isOn && (
        <div
          className="absolute inset-0 rounded-2xl border-2 pointer-events-none"
          style={{ borderColor: '#ef4444', opacity: 0.3, animation: 'pulseRing 1.5s ease-out infinite' }}
        />
      )}
    </motion.div>
  );
}
