import { NextResponse } from 'next/server';

export interface SensorDataPoint {
  time: number;
  vibration: number;
  temperature: number;
  current: number;
  label: 'normal' | 'abnormal';
}

// Thresholds
const THRESHOLDS = {
  vibration: 0.3,
  temperature: 45,
  current: 3.0,
};

function generateSensorData(): SensorDataPoint[] {
  const data: SensorDataPoint[] = [];
  
  // Generate data from 0 to 30 seconds with 0.1 step (~300 data points)
  for (let t = 0; t <= 30; t += 0.1) {
    const time = Math.round(t * 10) / 10; // Round to 1 decimal
    
    // Normal baseline values
    let vibration = 0.15 + Math.random() * 0.05; // 0.15-0.20
    let temperature = 38 + Math.random() * 3; // 38-41°C
    let current = 2.0 + Math.random() * 0.3; // 2.0-2.3A
    
    // Add abnormal spike between t=10 and t=15
    if (time >= 10 && time <= 15) {
      const spikeIntensity = Math.sin((time - 10) * Math.PI / 5); // Smooth spike
      vibration += spikeIntensity * 0.25; // Spike up to ~0.4-0.45
      temperature += spikeIntensity * 12; // Spike up to ~50-53°C
      current += spikeIntensity * 1.5; // Spike up to ~3.5-3.8A
    }
    
    // Determine if abnormal
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

export async function GET() {
  const data = generateSensorData();
  
  return NextResponse.json({
    data,
    thresholds: THRESHOLDS,
    metadata: {
      totalPoints: data.length,
      duration: 30,
      samplingRate: 10, // Hz
    }
  });
}

