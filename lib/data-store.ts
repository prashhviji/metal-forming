// Local in-memory data store — no external database needed
// All sensor data is generated and managed locally

import { SensorDataPoint, SensorResponse } from '@/types/sensor';

// Machine profile for realistic simulation
const MACHINE_PROFILES = {
  'CNC-001': {
    name: 'Haas VF-2 Mill',
    type: 'Vertical Mill',
    location: 'Bay A - Station 1',
    installDate: '2023-03-15',
    operatingHours: 12480,
    status: 'running' as const,
  },
};

// Thresholds for sensor readings
export const THRESHOLDS = {
  vibration: 0.3,
  temperature: 45,
  current: 3.0,
};

// Historical alert log stored in memory
export interface AlertRecord {
  id: string;
  timestamp: Date;
  type: 'vibration' | 'temperature' | 'current';
  value: number;
  threshold: number;
  severity: 'Critical' | 'High' | 'Medium';
  acknowledged: boolean;
}

// Generate a batch of sensor data simulating 30 seconds of readings
export function generateSensorData(): SensorDataPoint[] {
  const data: SensorDataPoint[] = [];

  for (let t = 0; t <= 30; t += 0.1) {
    const time = Math.round(t * 10) / 10;

    // Normal baseline values with slight noise
    let vibration = 0.15 + Math.random() * 0.05;
    let temperature = 38 + Math.random() * 3;
    let current = 2.0 + Math.random() * 0.3;

    // Inject an abnormal spike between t=10 and t=15
    if (time >= 10 && time <= 15) {
      const spikeIntensity = Math.sin(((time - 10) * Math.PI) / 5);
      vibration += spikeIntensity * 0.25;
      temperature += spikeIntensity * 12;
      current += spikeIntensity * 1.5;
    }

    const isAbnormal =
      vibration > THRESHOLDS.vibration ||
      temperature > THRESHOLDS.temperature ||
      current > THRESHOLDS.current;

    data.push({
      time,
      vibration: Math.round(vibration * 1000) / 1000,
      temperature: Math.round(temperature * 100) / 100,
      current: Math.round(current * 1000) / 1000,
      label: isAbnormal ? 'abnormal' : 'normal',
    });
  }

  return data;
}

// Build the full sensor response payload
export function getSensorResponse(): SensorResponse {
  const data = generateSensorData();
  return {
    data,
    thresholds: THRESHOLDS,
    metadata: {
      totalPoints: data.length,
      duration: 30,
      samplingRate: 10,
    },
  };
}

// Derive alerts from a batch of sensor data
export function deriveAlerts(data: SensorDataPoint[]): AlertRecord[] {
  const alerts: AlertRecord[] = [];

  data.forEach((point) => {
    if (point.vibration > THRESHOLDS.vibration) {
      alerts.push({
        id: `vib-${point.time}`,
        timestamp: new Date(Date.now() - (30 - point.time) * 1000),
        type: 'vibration',
        value: point.vibration,
        threshold: THRESHOLDS.vibration,
        severity: 'Critical',
        acknowledged: false,
      });
    }
    if (point.temperature > THRESHOLDS.temperature) {
      alerts.push({
        id: `temp-${point.time}`,
        timestamp: new Date(Date.now() - (30 - point.time) * 1000),
        type: 'temperature',
        value: point.temperature,
        threshold: THRESHOLDS.temperature,
        severity: 'High',
        acknowledged: false,
      });
    }
    if (point.current > THRESHOLDS.current) {
      alerts.push({
        id: `cur-${point.time}`,
        timestamp: new Date(Date.now() - (30 - point.time) * 1000),
        type: 'current',
        value: point.current,
        threshold: THRESHOLDS.current,
        severity: 'Medium',
        acknowledged: false,
      });
    }
  });

  return alerts;
}

// Machine info helper
export function getMachineInfo() {
  return MACHINE_PROFILES['CNC-001'];
}
