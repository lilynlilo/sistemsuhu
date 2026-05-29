import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { connectSSE, fetchRecent, sendControl } from '../services/mqttService';

const SensorContext = createContext(null);

const DEFAULT_THRESHOLD = {
  waterMin: 22,
  waterMax: 28,
  envMin: 25,
  envMax: 35,
  min: 22, // compatibility fallback
  max: 28  // compatibility fallback
};
const CHART_MAX_POINTS  = 50;

export function SensorProvider({ children }) {
  const [threshold, setThreshold] = useState(() => {
    const saved = localStorage.getItem('hydrocontrol-threshold');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          waterMin: parsed.waterMin !== undefined ? parsed.waterMin : (parsed.min !== undefined ? parsed.min : 22),
          waterMax: parsed.waterMax !== undefined ? parsed.waterMax : (parsed.max !== undefined ? parsed.max : 28),
          envMin: parsed.envMin !== undefined ? parsed.envMin : 25,
          envMax: parsed.envMax !== undefined ? parsed.envMax : 35,
          min: parsed.waterMin !== undefined ? parsed.waterMin : (parsed.min !== undefined ? parsed.min : 22),
          max: parsed.waterMax !== undefined ? parsed.waterMax : (parsed.max !== undefined ? parsed.max : 28),
        };
      } catch (e) {
        return DEFAULT_THRESHOLD;
      }
    }
    return DEFAULT_THRESHOLD;
  });

  const [latest, setLatest]         = useState(null);
  const [chartData, setChartData]   = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [mqttStatus, setMqttStatus] = useState('connecting'); // 'connecting' | 'connected' | 'error'

  // ─── Koneksi SSE ke backend ──────────────────────────────────
  useEffect(() => {
    // Muat data chart awal dari database (50 pembacaan terakhir)
    fetchRecent(50)
      .then((readings) => {
        if (readings && readings.length > 0) {
          const mapped = readings.map((r) => ({
            time: new Date(r.timestamp).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            waterTemp: r.water_temp,
            envTemp: r.env_temp,
          }));
          setChartData(mapped);

          // Set data terbaru dari database
          const last = readings[readings.length - 1];
          setLatest({
            timestamp: last.timestamp,
            waterTemp: last.water_temp,
            envTemp: last.env_temp,
            peltierOn: last.peltier_on === 1,
          });
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('Gagal memuat data awal:', err);
        setLatest({
          timestamp: new Date().toISOString(),
          waterTemp: 0,
          envTemp: 0,
          peltierOn: false,
        });
        setIsLoading(false);
      });

    // Buka koneksi SSE untuk data real-time
    const sse = connectSSE(
      (data) => {
        // Data baru dari MQTT via SSE
        const reading = {
          timestamp: data.timestamp || new Date().toISOString(),
          waterTemp: data.waterTemp !== undefined ? parseFloat(data.waterTemp) : 0,
          envTemp: data.envTemp !== undefined ? parseFloat(data.envTemp) : 0,
          peltierOn: data.peltierOn === true,
        };

        setLatest(reading);
        setIsLoading(false);
        setMqttStatus('connected');

        setChartData((prev) => {
          const next = [
            ...prev,
            {
              time: new Date().toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              waterTemp: reading.waterTemp,
              envTemp: reading.envTemp,
            },
          ];
          return next.length > CHART_MAX_POINTS ? next.slice(-CHART_MAX_POINTS) : next;
        });
      },
      (err) => {
        console.error('SSE Error:', err);
        setMqttStatus('error');
      },
      // Callback untuk status MQTT dari server
      (status) => {
        console.log('📡 MQTT Status update:', status);
        setMqttStatus(status);
      }
    );

    return () => {
      if (sse) sse.close();
    };
  }, []);

  // ─── Threshold ─────────────────────────────────────────────
  const updateThreshold = useCallback((newThreshold) => {
    setThreshold(newThreshold);
    localStorage.setItem('hydrocontrol-threshold', JSON.stringify(newThreshold));
  }, []);

  // ─── Kontrol Peltier ──────────────────────────────────────
  const controlPeltier = useCallback(async (command) => {
    try {
      const result = await sendControl(command);
      console.log('Kontrol Peltier:', result);
      return result;
    } catch (err) {
      console.error('Gagal kontrol Peltier:', err);
      throw err;
    }
  }, []);

  // ─── Status suhu ──────────────────────────────────────────
  const getWaterStatus = useCallback(() => {
    if (!latest) return 'normal';
    if (latest.waterTemp > threshold.waterMax) return 'high';
    if (latest.peltierOn) return 'cooling';
    return 'normal';
  }, [latest, threshold]);

  const getEnvStatus = useCallback(() => {
    if (!latest) return 'normal';
    if (latest.envTemp > threshold.envMax) return 'high';
    return 'normal';
  }, [latest, threshold]);

  return (
    <SensorContext.Provider
      value={{
        latest,
        chartData,
        threshold,
        isLoading,
        mqttStatus,
        updateThreshold,
        controlPeltier,
        getWaterStatus,
        getEnvStatus,
      }}
    >
      {children}
    </SensorContext.Provider>
  );
}

export const useSensor = () => useContext(SensorContext);
