export interface SensorDataPoint {
  time: number;
  vibration: number;
  temperature: number;
  current: number;
  label: 'normal' | 'abnormal';
}

export interface SensorResponse {
  data: SensorDataPoint[];
  thresholds: {
    vibration: number;
    temperature: number;
    current: number;
  };
  metadata: {
    totalPoints: number;
    duration: number;
    samplingRate: number;
  };
}

