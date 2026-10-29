'use client';

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

// Register once; importing this module from any chart component is enough.
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler, Legend);

ChartJS.defaults.font.family = 'inherit';
ChartJS.defaults.font.size = 11;
ChartJS.defaults.color = 'rgba(255,255,255,0.55)';
ChartJS.defaults.animation = false; // live data: redrawing with animation looks jittery

export const GRID = 'rgba(255,255,255,0.05)';
export const AXIS_TEXT = 'rgba(255,255,255,0.5)';
export const DANGER = '#f87171';

export const TOOLTIP = {
  backgroundColor: 'rgba(8, 12, 24, 0.96)',
  titleColor: 'rgba(255,255,255,0.7)',
  bodyColor: '#ffffff',
  borderColor: 'rgba(255,255,255,0.12)',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 10,
  boxPadding: 4,
} as const;

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
