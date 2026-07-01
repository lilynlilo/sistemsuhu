import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { CalendarDays, Download, Filter } from 'lucide-react';
import { fetchHistory } from '../services/mqttService';

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getAggregatedData(data, aggType) {
  if (aggType === 'realtime') return data;
  if (!data || data.length === 0) return [];

  const groups = {};

  data.forEach(row => {
    const d = new Date(row.timestamp);
    let key = '';
    
    if (aggType === 'minute') {
      const hr = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      key = `${row.date} ${hr}:${min}`;
    } else if (aggType === 'hour') {
      const hr = String(d.getHours()).padStart(2, '0');
      key = `${row.date} ${hr}:00`;
    }

    if (!groups[key]) {
      groups[key] = {
        date: row.date,
        time: aggType === 'hour' ? `${String(d.getHours()).padStart(2, '0')}:00:00` : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`,
        count: 0,
        waterSum: 0,
        envSum: 0,
        peltierOnCount: 0,
      };
    }
    
    groups[key].count++;
    groups[key].waterSum += parseFloat(row.waterTemp) || 0;
    groups[key].envSum += parseFloat(row.envTemp) || 0;
    if (row.peltierOn) groups[key].peltierOnCount++;
  });

  return Object.values(groups).map(g => ({
    date: g.date,
    time: g.time,
    waterTemp: (g.waterSum / g.count).toFixed(1),
    envTemp: (g.envSum / g.count).toFixed(1),
    peltierOn: g.peltierOnCount > 0, // dianggap ON jika dalam rentang waktu tersebut pernah ON
  }));
}

export default function History() {
  const [dateRange, setDateRange] = useState([new Date(), new Date()]);
  const [startDate, endDate] = dateRange;
  const [historyData,  setHistoryData]  = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [aggregation,  setAggregation]  = useState('realtime'); // 'realtime', 'minute', 'hour'

  useEffect(() => {
    if (!startDate) return;
    setLoading(true);
    setError('');

    const start = formatDate(startDate);
    const end = endDate ? formatDate(endDate) : start;

    fetchHistory(start, end)
      .then((result) => {
        // Map data dari database ke format yang digunakan komponen
        const mapped = (result.data || []).map((row) => {
          const ts = new Date(row.timestamp);
          const dayStr = String(ts.getDate()).padStart(2, '0');
          const monStr = String(ts.getMonth() + 1).padStart(2, '0');
          const yrStr = ts.getFullYear();
          
          const hrStr = String(ts.getHours()).padStart(2, '0');
          const minStr = String(ts.getMinutes()).padStart(2, '0');
          const secStr = String(ts.getSeconds()).padStart(2, '0');

          return {
            timestamp: row.timestamp,
            date: `${dayStr}/${monStr}/${yrStr}`,
            time: `${hrStr}:${minStr}:${secStr}`,
            waterTemp: row.water_temp,
            envTemp: row.env_temp,
            peltierOn: !!row.peltier_on,
          };
        });

        setHistoryData(mapped);
        setStats(result.stats || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Gagal memuat history:', err);
        setError('Gagal memuat data history. Pastikan backend server berjalan.');
        setHistoryData([]);
        setStats(null);
        setLoading(false);
      });
  }, [startDate, endDate]);

  const displayData = getAggregatedData(historyData, aggregation);

  const handleDownloadCSV = () => {
    if (displayData.length === 0) return;
    const header = ['Tanggal', 'Jam', 'Suhu Air (°C)', 'Suhu Greenhouse (°C)', 'Status Peltier'].join(',');
    const rows = displayData.map(row => [
      row.date,
      row.time,
      row.waterTemp,
      row.envTemp,
      row.peltierOn ? 'ON' : 'OFF'
    ].join(','));
    const csvContent = [header, ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = startDate ? formatDate(startDate) : 'history';
    const endStr = endDate ? formatDate(endDate) : dateStr;
    link.setAttribute('download', `history_suhu_${dateStr}_to_${endStr}_${aggregation}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const peltierOnCount  = displayData.filter(d => d.peltierOn).length;
  const maxWater        = displayData.length ? Math.max(...displayData.map(d => parseFloat(d.waterTemp))).toFixed(1) : '--';
  const maxEnv          = displayData.length ? Math.max(...displayData.map(d => parseFloat(d.envTemp))).toFixed(1) : '--';

  return (
    <div className="space-y-6">
      {/* ── Header Controls ── */}
      <div className="card p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center gap-4" style={{ overflow: 'visible', position: 'relative', zIndex: 50 }}>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 shrink-0" style={{ color: 'var(--accent)' }} />
          <span className="font-medium text-sm whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
            Pilih Tanggal:
          </span>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          <div className="relative">
            <DatePicker
              id="start-date"
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
          <span className="font-bold flex-shrink-0" style={{ color: 'var(--text-muted)' }}>-</span>
          <div className="relative">
            <DatePicker
              id="end-date"
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

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:ml-auto">
          {/* Dropdown Agregasi */}
          <div className="relative flex items-center px-3 py-2.5 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <Filter className="w-4 h-4 mr-2" style={{ color: 'var(--text-muted)' }} />
            <select 
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value)}
              className="bg-transparent text-sm font-semibold outline-none cursor-pointer"
              style={{ color: 'var(--text-primary)' }}
            >
              <option value="realtime">Data Realtime</option>
              <option value="minute">Rata-rata per Menit</option>
              <option value="hour">Rata-rata per Jam</option>
            </select>
          </div>

          <button
            onClick={handleDownloadCSV}
            disabled={displayData.length === 0}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${displayData.length === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'}`}
            style={{
              background: displayData.length === 0 ? 'var(--bg-secondary)' : 'rgba(34,197,94,0.15)',
              color:      displayData.length === 0 ? 'var(--text-muted)' : '#22c55e',
              border:     displayData.length === 0 ? '1px solid var(--border-color)' : '1px solid rgba(34,197,94,0.3)',
            }}
            title="Download CSV"
          >
            <Download className="w-4 h-4" />
            <span>Unduh CSV</span>
          </button>
        </div>
      </div>

      {/* ── Error Message ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 flex items-center gap-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
        >
          <span>⚠️</span>
          {error}
        </motion.div>
      )}

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Data',      value: displayData.length,       color: 'var(--accent)', unit: 'baris' },
          { label: 'Maks Suhu Air',   value: maxWater,                 color: '#3b82f6',       unit: '°C'    },
          { label: 'Maks Greenhouse', value: maxEnv,                   color: '#22c55e',       unit: '°C'    },
          { label: 'Peltier ON',      value: peltierOnCount,           color: '#3b82f6',       unit: 'kali'  },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="card p-4 text-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
            <p className="text-2xl font-extrabold font-mono" style={{ color: stat.color }}>
              {stat.value}
              <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{stat.unit}</span>
            </p>
          </motion.div>
        ))}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="card p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Memuat data history dari database...</p>
          </div>
        </div>
      ) : (
        <motion.div className="card overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Data History — {startDate?.toLocaleDateString('id-ID')} {endDate && endDate.getTime() !== startDate?.getTime() ? ` s/d ${endDate.toLocaleDateString('id-ID')}` : ''}
              {aggregation !== 'realtime' && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>({aggregation === 'minute' ? 'Rata-rata per Menit' : 'Rata-rata per Jam'})</span>}
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
              {displayData.length} baris
            </span>
          </div>
          {displayData.length > 0 ? (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="data-table">
                <thead className="sticky top-0">
                  <tr>
                    <th>Tanggal</th>
                    <th>Jam</th>
                    <th>Suhu Air (°C)</th>
                    <th>Suhu Greenhouse (°C)</th>
                    <th>Status Peltier</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((row, i) => (
                    <tr key={i}>
                      <td className="font-mono text-xs">{row.date}</td>
                      <td className="font-mono text-xs">{row.time}</td>
                      <td>
                        <span className="font-semibold" style={{ color: row.waterTemp > 29 ? '#ef4444' : '#22c55e' }}>
                          {row.waterTemp}
                        </span>
                      </td>
                      <td>
                        <span className="font-semibold text-blue-400">{row.envTemp}</span>
                      </td>
                      <td>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background: row.peltierOn ? 'rgba(59,130,246,0.15)' : 'rgba(148,163,184,0.15)',
                            color:      row.peltierOn ? '#3b82f6' : 'var(--text-muted)',
                          }}
                        >
                          {row.peltierOn ? 'ON' : 'OFF'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada data untuk tanggal ini</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
