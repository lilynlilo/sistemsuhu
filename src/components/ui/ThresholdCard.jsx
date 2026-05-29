import { motion } from 'framer-motion';
import { Sliders, Droplets, Wind } from 'lucide-react';

export default function ThresholdCard({ threshold, min, max }) {
  const wMin = threshold?.waterMin ?? min ?? 22;
  const wMax = threshold?.waterMax ?? max ?? 28;
  const eMin = threshold?.envMin ?? 25;
  const eMax = threshold?.envMax ?? 35;

  return (
    <motion.div
      className="card p-5 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      {/* Deco */}
      <div
        className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full opacity-5 pointer-events-none"
        style={{ background: 'var(--accent)' }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8.5 h-8.5 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
          <Sliders className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Threshold Sistem
          </p>
          <p className="text-xxs text-[10px]" style={{ color: 'var(--text-muted)' }}>Batas ambang batas otomatis</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Water Threshold */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
              <Droplets className="w-3.5 h-3.5 text-blue-500" /> Suhu Air
            </span>
            <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
              {wMin}°C — {wMax}°C
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden relative" style={{ background: 'var(--bg-secondary)' }}>
            <div
              className="absolute h-full rounded-full"
              style={{
                left:       `${(wMin / 50) * 100}%`,
                width:      `${((wMax - wMin) / 50) * 100}%`,
                background: 'linear-gradient(90deg, #22c55e, #ef4444)',
              }}
            />
          </div>
        </div>

        {/* Greenhouse Threshold */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
              <Wind className="w-3.5 h-3.5 text-emerald-500" /> Greenhouse
            </span>
            <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
              {eMin}°C — {eMax}°C
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden relative" style={{ background: 'var(--bg-secondary)' }}>
            <div
              className="absolute h-full rounded-full"
              style={{
                left:       `${(eMin / 60) * 100}%`,
                width:      `${((eMax - eMin) / 60) * 100}%`,
                background: 'linear-gradient(90deg, #3b82f6, #ef4444)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <span>Min: {Math.min(wMin, eMin)}°C</span>
        <span>Max: {Math.max(wMax, eMax)}°C</span>
      </div>
    </motion.div>
  );
}
