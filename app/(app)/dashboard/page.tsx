'use client';

import { useEffect, useState } from 'react';
import { SensorChart } from '@/components/sensor-chart';
import { StatusCard } from '@/components/status-card';
import { Activity, Thermometer, Zap, Clock, Server, Wifi } from 'lucide-react';
import { SensorResponse } from '@/types/sensor';

export default function DashboardPage() {
  const [sensorData, setSensorData] = useState<SensorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/sensor-data');
        const data = await response.json();
        setSensorData(data);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to fetch sensor data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !sensorData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-14 w-14">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-500" />
            <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-b-purple-500" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="mt-5 text-sm text-white/40">Loading sensor data...</p>
        </div>
      </div>
    );
  }

  const { data, thresholds } = sensorData;
  const latestData = data[data.length - 1];
  const abnormalCount = data.filter((d) => d.label === 'abnormal').length;

  const vibrationStatus = latestData.vibration > thresholds.vibration ? 'critical' : 'normal';
  const temperatureStatus = latestData.temperature > thresholds.temperature ? 'critical' : 'normal';
  const currentStatus = latestData.current > thresholds.current ? 'warning' : 'normal';

  const times = data.map((d) => d.time);
  const vibrations = data.map((d) => d.vibration);
  const temperatures = data.map((d) => d.temperature);
  const currents = data.map((d) => d.current);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Machine Dashboard
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Real-time monitoring · Haas VF-2 Mill · Bay A
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-white/30">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>Updated {lastUpdate.toLocaleTimeString()}</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <Wifi className="h-3 w-3 text-green-400" />
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3">
        <div className="flex items-center gap-2">
          <Server className="h-3.5 w-3.5 text-white/30" />
          <span className="text-xs text-white/40">Data Points</span>
          <span className="text-xs font-semibold text-white">{sensorData.metadata.totalPoints}</span>
        </div>
        <div className="h-3 w-px bg-white/[0.08]" />
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-white/30" />
          <span className="text-xs text-white/40">Sample Rate</span>
          <span className="text-xs font-semibold text-white">{sensorData.metadata.samplingRate} Hz</span>
        </div>
        <div className="h-3 w-px bg-white/[0.08]" />
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-white/30" />
          <span className="text-xs text-white/40">Duration</span>
          <span className="text-xs font-semibold text-white">{sensorData.metadata.duration}s</span>
        </div>
        <div className="h-3 w-px bg-white/[0.08]" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Anomalies</span>
          <span className={`text-xs font-semibold ${abnormalCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {abnormalCount}
          </span>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-3 stagger-children">
        <StatusCard
          title="Vibration"
          value={latestData.vibration.toFixed(3)}
          unit="g"
          status={vibrationStatus}
          icon={Activity}
          threshold={`${thresholds.vibration}g`}
        />
        <StatusCard
          title="Temperature"
          value={latestData.temperature.toFixed(1)}
          unit="°C"
          status={temperatureStatus}
          icon={Thermometer}
          threshold={`${thresholds.temperature}°C`}
        />
        <StatusCard
          title="Current"
          value={latestData.current.toFixed(2)}
          unit="A"
          status={currentStatus}
          icon={Zap}
          threshold={`${thresholds.current}A`}
        />
      </div>

      {/* Charts */}
      <div className="space-y-4 stagger-children">
        <SensorChart
          title="Vibration"
          description="Mechanical oscillation intensity"
          data={vibrations}
          labels={times}
          threshold={thresholds.vibration}
          unit="g"
          color="#3b82f6"
        />
        <SensorChart
          title="Temperature"
          description="Spindle and motor thermal readings"
          data={temperatures}
          labels={times}
          threshold={thresholds.temperature}
          unit="°C"
          color="#f59e0b"
        />
        <SensorChart
          title="Current"
          description="Motor electrical draw"
          data={currents}
          labels={times}
          threshold={thresholds.current}
          unit="A"
          color="#10b981"
        />
      </div>
    </div>
  );
}
