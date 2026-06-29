import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Droplets, Wind, CalendarDays, Radio } from 'lucide-react';
import { useSensor } from '../context/SensorContext';
import { fetchHistory } from '../services/mqttService';
import TemperatureChart from '../components/charts/TemperatureChart';

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function Charts() {
  const { chartData, threshold } = useSensor();

  // Mode: 'live' (real-time) or 'history' (date-based)
  const [mode, setMode] = useState('live');
  const [dateRange, setDateRange] = useState([new Date(), new Date()]);
  const [startDate, endDate] = dateRange;
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch history data when date changes and mode is 'history'
  useEffect(() => {
    if (mode !== 'history' || !startDate) return;
    setLoading(true);

    const start = formatDate(startDate);
    const end = endDate ? formatDate(endDate) : start;

    fetchHistory(start, end)
      .then((result) => {
        const mapped = (result.data || []).map((row) => {
          const ts = new Date(row.timestamp);
          return {
            time: ts.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            waterTemp: row.water_temp,
            envTemp: row.env_temp,
          };
        });
        setHistoryData(mapped);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Gagal memuat data grafik:', err);
        setHistoryData([]);
        setLoading(false);
      });
  }, [mode, startDate, endDate]);

  // Choose which data to display
  const displayData = mode === 'live' ? chartData : historyData;
  const isLive = mode === 'live';

  const dateLabel = startDate
    ? startDate.toLocaleDateString('id-ID') +
      (endDate && endDate.getTime() !== startDate.getTime()
        ? ` s/d ${endDate.toLocaleDateString('id-ID')}`
        : '')
    : '';

  return (
    <div className="space-y-6">
      {/* ── Date Picker & Mode Toggle ── */}
      <div className="card p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center gap-4" style={{ overflow: 'visible', position: 'relative', zIndex: 50 }}>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 shrink-0" style={{ color: 'var(--accent)' }} />
          <span className="font-medium text-sm whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
            Mode Grafik:
          </span>
        </div>

        {/* Mode Toggle Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setMode('live')}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: isLive ? 'var(--accent)' : 'var(--bg-secondary)',
              color: isLive ? '#fff' : 'var(--text-secondary)',
            }}
          >
            <Radio className="w-4 h-4" /> Live
          </button>
          <button
            onClick={() => setMode('history')}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: !isLive ? 'var(--accent)' : 'var(--bg-secondary)',
              color: !isLive ? '#fff' : 'var(--text-secondary)',
            }}
          >
            <CalendarDays className="w-4 h-4" /> History
          </button>
        </div>

        {/* Date Pickers (shown only in history mode) */}
        {!isLive && (
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
            <div className="relative">
              <DatePicker
                id="chart-start-date"
                selected={startDate}
                onChange={(date) => {
                  if (endDate && date > endDate) setDateRange([date, date]);
                  else setDateRange([date, endDate || date]);
                }}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                dateFormat="dd MMM yy"
                maxDate={new Date()}
                className="w-28 sm:w-36 px-3 py-2.5 rounded-xl border text-sm font-medium outline-none cursor-pointer text-center"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                calendarClassName="history-calendar"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                portalId="datepicker-portal"
              />
            </div>
            <span className="font-bold flex-shrink-0" style={{ color: 'var(--text-muted)' }}>—</span>
            <div className="relative">
              <DatePicker
                id="chart-end-date"
                selected={endDate}
                onChange={(date) => {
                  if (startDate && date < startDate) setDateRange([date, date]);
                  else setDateRange([startDate || date, date]);
                }}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate || undefined}
                maxDate={new Date()}
                dateFormat="dd MMM yy"
                className="w-28 sm:w-36 px-3 py-2.5 rounded-xl border text-sm font-medium outline-none cursor-pointer text-center"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                calendarClassName="history-calendar"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                portalId="datepicker-portal"
              />
            </div>
          </div>
        )}

        {/* Status badge */}
        <div className="md:ml-auto w-full md:w-auto flex justify-end">
          {isLive ? (
            <span
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-green-500" />
              LIVE — Data Real-time
            </span>
          ) : (
            <span
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
            >
              <CalendarDays className="w-3 h-3" />
              {dateLabel}
            </span>
          )}
        </div>
      </div>

      {/* ── Loading State ── */}
      {loading && !isLive && (
        <div className="card p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Memuat data grafik dari database...</p>
          </div>
        </div>
      )}

      {/* ── Water Temp Chart ── */}
      {!(loading && !isLive) && (
        <>
          <motion.div
            className="card p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                <Droplets className="w-5 h-5" style={{ color: '#22c55e' }} />
              </div>
              <div>
                <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Suhu Air Hidroponik</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Threshold Air: Min {threshold.waterMin ?? threshold.min ?? 22}°C — Max {threshold.waterMax ?? threshold.max ?? 28}°C
                </p>
              </div>
              {isLive && (
                <span
                  className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-green-500" />
                  LIVE
                </span>
              )}
            </div>
            {displayData.length > 0 ? (
              <TemperatureChart
                data={displayData}
                threshold={threshold}
                showEnv={false}
                height={320}
                type="water"
              />
            ) : (
              <div className="flex items-center justify-center h-40">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {isLive ? 'Menunggu data dari sensor...' : 'Belum ada data untuk tanggal ini'}
                </p>
              </div>
            )}
          </motion.div>

          {/* ── Env Temp Chart ── */}
          <motion.div
            className="card p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
                <Wind className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Suhu Lingkungan Greenhouse</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Threshold Greenhouse: Min {threshold.envMin ?? 25}°C — Max {threshold.envMax ?? 35}°C
                </p>
              </div>
              {isLive && (
                <span
                  className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-blue-500" />
                  LIVE
                </span>
              )}
            </div>

            {displayData.length > 0 ? (
              <>
                {/* Chart hanya env */}
                <TemperatureChart
                  data={displayData.map(d => ({ ...d, waterTemp: d.envTemp, envTemp: undefined }))}
                  threshold={threshold}
                  showEnv={false}
                  height={320}
                  type="env"
                />

                {/* Legend custom */}
                <div className="flex items-center gap-2 mt-2 justify-end">
                  <span className="w-4 h-0.5 rounded bg-blue-400 inline-block" style={{ borderTop: '2px solid #3b82f6' }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Suhu Lingkungan</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {isLive ? 'Menunggu data dari sensor...' : 'Belum ada data untuk tanggal ini'}
                </p>
              </div>
            )}
          </motion.div>

          {/* ── Combined Chart ── */}
          <motion.div
            className="card p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div>
                <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Perbandingan Kedua Sensor</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Suhu Air dan Lingkungan dalam satu grafik
                  {!isLive && dateLabel ? ` — ${dateLabel}` : ''}
                </p>
              </div>
            </div>
            {displayData.length > 0 ? (
              <TemperatureChart
                data={displayData}
                threshold={threshold}
                showEnv={true}
                height={320}
              />
            ) : (
              <div className="flex items-center justify-center h-40">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {isLive ? 'Menunggu data dari sensor...' : 'Belum ada data untuk tanggal ini'}
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
