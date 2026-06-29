import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchRecent, sendControl } from '../services/mqttService';

const SensorContext = createContext(null);

const DEFAULT_THRESHOLD = {
  waterMin: 22,
  waterMax: 28,
  envMin: 25,
  envMax: 35,
  min: 22,
  max: 28
};
const CHART_MAX_POINTS = 50;

export function SensorProvider({ children }) {
  const [threshold, setThreshold] = useState(() => {
    const saved = localStorage.getItem('hydrocontrol-threshold');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          waterMin: parsed.waterMin !== undefined ? parsed.waterMin : (parsed.min !== undefined ? parsed.min : 22),
          waterMax: parsed.waterMax !== undefined ? parsed.waterMax : (parsed.max !== undefined ? parsed.max : 28),
          envMin:   parsed.envMin !== undefined ? parsed.envMin : 25,
          envMax:   parsed.envMax !== undefined ? parsed.envMax : 35,
          min:      parsed.waterMin !== undefined ? parsed.waterMin : (parsed.min !== undefined ? parsed.min : 22),
          max:      parsed.waterMax !== undefined ? parsed.waterMax : (parsed.max !== undefined ? parsed.max : 28),
        };
      } catch {
        return DEFAULT_THRESHOLD;
      }
    }
    return DEFAULT_THRESHOLD;
  });

  const [latest,         setLatest]         = useState(null);
  const [chartData,      setChartData]      = useState([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');

  useEffect(() => {
    // Muat 50 data terakhir dari database sebagai data awal
    fetchRecent(50)
      .then((readings) => {
        if (readings && readings.length > 0) {
          const mapped = readings.map((r) => ({
            time: new Date(r.timestamp).toLocaleTimeString('id-ID', {
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            }),
            waterTemp: r.water_temp,
            envTemp:   r.env_temp,
          }));
          setChartData(mapped);

          const last = readings[readings.length - 1];
          setLatest({
            timestamp: last.timestamp,
            waterTemp: last.water_temp,
            envTemp:   last.env_temp,
            peltierOn: !!last.peltier_on,
          });
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('Gagal memuat data awal:', err);
        setLatest({ timestamp: new Date().toISOString(), waterTemp: 0, envTemp: 0, peltierOn: false });
        setIsLoading(false);
      });

    // Subscribe ke INSERT baru di tabel sensor_readings via Supabase Realtime
    const channel = supabase
      .channel('sensor-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        (payload) => {
          const r = payload.new;
          const reading = {
            timestamp: r.timestamp,
            waterTemp: parseFloat(r.water_temp),
            envTemp:   parseFloat(r.env_temp),
            peltierOn: !!r.peltier_on,
          };

          setLatest(reading);
          setIsLoading(false);
          setRealtimeStatus('connected');

          setChartData((prev) => {
            const next = [
              ...prev,
              {
                time: new Date(r.timestamp).toLocaleTimeString('id-ID', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                }),
                waterTemp: reading.waterTemp,
                envTemp:   reading.envTemp,
              },
            ];
            return next.length > CHART_MAX_POINTS ? next.slice(-CHART_MAX_POINTS) : next;
          });
        }
      )
      .subscribe((status) => {
        console.log('Supabase Realtime status:', status);
        if (status === 'SUBSCRIBED')    setRealtimeStatus('connected');
        if (status === 'CHANNEL_ERROR') setRealtimeStatus('error');
        if (status === 'TIMED_OUT')     setRealtimeStatus('error');
        if (status === 'CLOSED')        setRealtimeStatus('error');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ─── Threshold ─────────────────────────────────────────────
  const updateThreshold = useCallback((newThreshold) => {
    setThreshold(newThreshold);
    localStorage.setItem('hydrocontrol-threshold', JSON.stringify(newThreshold));
  }, []);

  // ─── Kontrol Peltier ─────────────────────────────────────
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

  // ─── Status suhu ─────────────────────────────────────────
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
        mqttStatus: realtimeStatus, // alias agar komponen lain tidak perlu diubah
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
