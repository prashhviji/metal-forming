import type { AlertSeverity, SensorKey, Thresholds } from '@/types/monitor';

export interface SensorMeta {
  key: SensorKey;
  label: string;
  unit: string;
  decimals: number;
  color: string;
  /** Severity assigned when this sensor exceeds its limit. */
  severity: AlertSeverity;
  blurb: string;
}

// Shared by the engine (server) and the UI (client) — keep free of imports with side effects.
export const SENSOR_KEYS: SensorKey[] = ['temperature', 'vibration', 'current'];

export const SENSORS: Record<SensorKey, SensorMeta> = {
  temperature: {
    key: 'temperature',
    label: 'Temperature',
    unit: '°C',
    decimals: 1,
    color: '#fb923c',
    severity: 'High',
    blurb: 'Thermal condition of the spindle / cutting zone',
  },
  vibration: {
    key: 'vibration',
    label: 'Vibration',
    unit: 'g',
    decimals: 3,
    color: '#60a5fa',
    severity: 'Critical',
    blurb: 'Mechanical behaviour — tool wear, imbalance, looseness',
  },
  current: {
    key: 'current',
    label: 'Motor current',
    unit: 'A',
    decimals: 2,
    color: '#a78bfa',
    severity: 'Medium',
    blurb: 'Motor load indication',
  },
};

export function alertMessage(key: SensorKey, limit: Thresholds[SensorKey]): string {
  switch (key) {
    case 'vibration':
      return `High vibration detected (limit ${limit.toFixed(2)} g)`;
    case 'temperature':
      return `Temperature exceeded ${limit} °C`;
    case 'current':
      return `Motor current above limit (${limit.toFixed(1)} A)`;
  }
}
