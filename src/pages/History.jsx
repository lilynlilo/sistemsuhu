import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, RefreshCw, Clock, Database } from 'lucide-react';
import { fetchHistory } from '../services/mqttService';

export default function History() {
  const [historyData, setHistoryData] = useState([]);
  const [stats, setStats] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(() => {
    setLoading(true);
    setError('');

    // Ambil 100 data terbaru dengan interval 30 detik (default dari API)
    fetchHistory({ limit: 100, interval: 30 })
      .then((result) => {
        const mapped = (result.data || []).map((row, index) => {
          const ts = new Date(row.timestamp);
          // Konversi ke WIB (UTC+7)
          const wib = new Date(ts.getTime() + (7 * 60 * 60 * 1000 - ts.getTimezoneOffset() * 60 * 1000));
          const dayStr = String(wib.getDate()).padStart(2, '0');
          const monStr = String(wib.getMonth() + 1).padStart(2, '0');
          const yrStr = wib.getFullYear();
          const hrStr = String(wib.getHours()).padStart(2, '0');
          const minStr = String(wib.getMinutes()).padStart(2, '0');
          const secStr = String(wib.getSeconds()).padStart(2, '0');

          return {
            no: index + 1,
            date: `${dayStr}/${monStr}/${yrStr}`,
            time: `${hrStr}:${minStr}:${secStr}`,
            waterTemp: row.water_temp,
            envTemp: row.env_temp,
            peltierOn: !!row.peltier_on,
          };
        });

        setHistoryData(mapped);
        setStats(result.stats || null);
        setInfo(result.info || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Gagal memuat history:', err);
        setError('Gagal memuat data history. Pastikan backend server berjalan.');
        setHistoryData([]);
        setStats(null);
        setInfo(null);
        setLoading(false);
      });
  }, []);

  // Muat data saat pertama kali dibuka
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownloadCSV = () => {
    if (historyData.length === 0) return;
    const header = ['No', 'Tanggal', 'Jam (WIB)', 'Suhu Air Nutrisi (°C)', 'Suhu Greenhouse (°C)', 'Status Peltier'].join(',');
    const rows = historyData.map(row => [
      row.no,
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
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    link.setAttribute('download', `history_suhu_${dateStr}_interval30s.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const maxWater = historyData.length ? Math.max(...historyData.map(d => parseFloat(d.waterTemp))).toFixed(1) : '--';
  const maxEnv = historyData.length ? Math.max(...historyData.map(d => parseFloat(d.envTemp))).toFixed(1) : '--';
  const peltierOnCount = historyData.filter(d => d.peltierOn).length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <Database className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Data Histori Sensor
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Menampilkan {historyData.length} data histori terbaru dengan interval 30 detik
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'}`}
            style={{
              background: 'rgba(59,130,246,0.15)',
              color: '#3b82f6',
              border: '1px solid rgba(59,130,246,0.3)',
            }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleDownloadCSV}
            disabled={historyData.length === 0}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${historyData.length === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'}`}
            style={{
              background: historyData.length === 0 ? 'var(--bg-secondary)' : 'rgba(34,197,94,0.15)',
              color: historyData.length === 0 ? 'var(--text-muted)' : '#22c55e',
              border: historyData.length === 0 ? '1px solid var(--border-color)' : '1px solid rgba(34,197,94,0.3)',
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
          { label: 'Total Data', value: historyData.length, color: 'var(--accent)', unit: 'baris' },
          { label: 'Maks Suhu Air', value: maxWater, color: '#3b82f6', unit: '°C' },
          { label: 'Maks Greenhouse', value: maxEnv, color: '#22c55e', unit: '°C' },
          { label: 'Peltier ON', value: peltierOnCount, color: '#3b82f6', unit: 'kali' },
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
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Memuat data history...</p>
          </div>
        </div>
      ) : (
        <motion.div className="card overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Tabel Data Histori
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                Interval 30 detik
              </span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
              {historyData.length} baris
            </span>
          </div>
          {historyData.length > 0 ? (
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="data-table">
                <thead className="sticky top-0">
                  <tr>
                    <th>No</th>
                    <th>Tanggal</th>
                    <th>Jam (WIB)</th>
                    <th>Suhu Air Nutrisi (°C)</th>
                    <th>Suhu Greenhouse (°C)</th>
                    <th>Status Peltier</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((row) => (
                    <tr key={row.no}>
                      <td className="font-mono text-xs text-center" style={{ color: 'var(--text-muted)' }}>{row.no}</td>
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
                            color: row.peltierOn ? '#3b82f6' : 'var(--text-muted)',
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
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada data histori</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
