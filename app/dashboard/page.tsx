'use client';

import { useEffect, useState } from 'react';
import { SensorChart } from '@/components/sensor-chart';
import { StatusCard } from '@/components/status-card';
import { Activity, Thermometer, Zap } from 'lucide-react';
import { SensorResponse } from '@/types/sensor';

export default function DashboardPage() {
  const [sensorData, setSensorData] = useState<SensorResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/sensor-data');
        const data = await response.json();
        setSensorData(data);
      } catch (error) {
        console.error('Failed to fetch sensor data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // Refresh data every 5 seconds for demo purposes
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !sensorData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading sensor data...</p>
        </div>
      </div>
    );
  }

  const { data, thresholds } = sensorData;
  
  // Get latest readings
  const latestData = data[data.length - 1];
  
  // Determine status for each sensor
  const vibrationStatus = latestData.vibration > thresholds.vibration ? 'critical' : 'normal';
  const temperatureStatus = latestData.temperature > thresholds.temperature ? 'critical' : 'normal';
  const currentStatus = latestData.current > thresholds.current ? 'warning' : 'normal';

  // Extract data for charts
  const times = data.map(d => d.time);
  const vibrations = data.map(d => d.vibration);
  const temperatures = data.map(d => d.temperature);
  const currents = data.map(d => d.current);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">CNC Machine Dashboard</h1>
        <p className="mt-2 text-gray-400">
          Real-time monitoring of critical machine parameters
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatusCard
          title="Vibration"
          value={latestData.vibration.toFixed(3)}
          unit="g"
          status={vibrationStatus}
          icon={Activity}
          threshold={`< ${thresholds.vibration}`}
        />
        <StatusCard
          title="Temperature"
          value={latestData.temperature.toFixed(1)}
          unit="°C"
          status={temperatureStatus}
          icon={Thermometer}
          threshold={`< ${thresholds.temperature}°C`}
        />
        <StatusCard
          title="Current"
          value={latestData.current.toFixed(2)}
          unit="A"
          status={currentStatus}
          icon={Zap}
          threshold={`< ${thresholds.current}A`}
        />
      </div>

      {/* Charts */}
      <div className="space-y-6">
        <SensorChart
          title="Vibration Over Time"
          data={vibrations}
          labels={times}
          threshold={thresholds.vibration}
          unit="g"
          color="#3b82f6"
        />
        <SensorChart
          title="Temperature Over Time"
          data={temperatures}
          labels={times}
          threshold={thresholds.temperature}
          unit="°C"
          color="#f59e0b"
        />
        <SensorChart
          title="Current Over Time"
          data={currents}
          labels={times}
          threshold={thresholds.current}
          unit="A"
          color="#10b981"
        />
      </div>

      {/* Footer Info */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-400">
            <span className="font-medium text-white">Sampling Rate:</span> {sensorData.metadata.samplingRate} Hz
          </div>
          <div className="text-gray-400">
            <span className="font-medium text-white">Total Data Points:</span> {sensorData.metadata.totalPoints}
          </div>
          <div className="text-gray-400">
            <span className="font-medium text-white">Duration:</span> {sensorData.metadata.duration}s
          </div>
        </div>
      </div>
    </div>
  );
}

