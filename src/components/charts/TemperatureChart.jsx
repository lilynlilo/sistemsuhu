import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl border text-sm"
      style={{
        background:   'var(--bg-card)',
        borderColor:  'var(--border-color)',
        boxShadow:    'var(--shadow-md)',
        color:        'var(--text-primary)',
      }}
    >
      <p className="font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{entry.name}:</span>
          <span className="font-bold">{entry.value}°C</span>
        </div>
      ))}
    </div>
  );
}

export default function TemperatureChart({ data = [], threshold, showEnv = true, height = 280, type = 'water' }) {
  const { isDark } = useTheme();

  const gridColor  = isDark ? '#2d3f58' : '#e2e8f0';
  const textColor  = isDark ? '#64748b' : '#94a3b8';
  const waterColor = isDark ? '#39FF8F' : '#22c55e';
  const envColor   = isDark ? '#60a5fa' : '#3b82f6';

  // Tentukan threshold berdasarkan tipe
  const hasThreshold = !!threshold && !showEnv;
  const tMin = type === 'water' 
    ? (threshold?.waterMin ?? threshold?.min ?? 22) 
    : (threshold?.envMin ?? 25);
  const tMax = type === 'water' 
    ? (threshold?.waterMax ?? threshold?.max ?? 28) 
    : (threshold?.envMax ?? 35);

  const tLabelMin = type === 'water' ? 'Min Air' : 'Min Greenhouse';
  const tLabelMax = type === 'water' ? 'Max Air' : 'Max Greenhouse';
  const strokeColorMin = type === 'water' ? '#22c55e' : '#3b82f6';
  const strokeColorMax = '#ef4444';

  const lineColor = type === 'env' ? envColor : waterColor;

  // Tentukan domain Y
  const allValues = data.flatMap(d => [d.waterTemp, showEnv ? d.envTemp : null].filter(Boolean));
  const minVal    = Math.floor(Math.min(...allValues, tMin) - 2);
  const maxVal    = Math.ceil(Math.max(...allValues, tMax) + 2);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />

        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: textColor }}
          tickLine={false}
          axisLine={{ stroke: gridColor }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minVal, maxVal]}
          tick={{ fontSize: 11, fill: textColor }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `${v}°`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: textColor, paddingTop: 12 }}
        />

        {/* Reference lines untuk threshold */}
        {hasThreshold && (
          <>
            <ReferenceLine
              y={tMax}
              stroke={strokeColorMax}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: `${tLabelMax} ${tMax}°C`, fill: strokeColorMax, fontSize: 10, position: 'right' }}
            />
            <ReferenceLine
              y={tMin}
              stroke={strokeColorMin}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: `${tLabelMin} ${tMin}°C`, fill: strokeColorMin, fontSize: 10, position: 'right' }}
            />
          </>
        )}

        {/* Suhu Air */}
        <Line
          type="monotone"
          dataKey="waterTemp"
          name={type === 'env' ? "Suhu Lingkungan" : "Suhu Air"}
          stroke={lineColor}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: lineColor, strokeWidth: 0 }}
        />

        {/* Suhu Lingkungan */}
        {showEnv && (
          <Line
            type="monotone"
            dataKey="envTemp"
            name="Suhu Lingkungan"
            stroke={envColor}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: envColor, strokeWidth: 0 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
