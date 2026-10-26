'use client';

import { useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SensorChartProps {
  title: string;
  data: number[];
  labels: number[];
  threshold?: number;
  unit: string;
  color: string;
  description?: string;
}

// Utility: convert hex color to rgba
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function SensorChart({
  title,
  data,
  labels,
  threshold,
  unit,
  color,
  description,
}: SensorChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

  // Create gradient fill on mount
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const ctx = chart.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, chart.chartArea?.bottom || 300);
    gradient.addColorStop(0, hexToRgba(color, 0.15));
    gradient.addColorStop(0.5, hexToRgba(color, 0.05));
    gradient.addColorStop(1, hexToRgba(color, 0));

    if (chart.data.datasets[0]) {
      chart.data.datasets[0].backgroundColor = gradient;
      chart.update('none');
    }
  }, [color, data]);

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: title,
        data: data,
        borderColor: color,
        backgroundColor: hexToRgba(color, 0.1),
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        borderWidth: 2,
      },
      ...(threshold
        ? [
            {
              label: 'Threshold',
              data: labels.map(() => threshold),
              borderColor: 'rgba(239, 68, 68, 0.5)',
              backgroundColor: 'transparent',
              borderWidth: 1.5,
              borderDash: [6, 4],
              pointRadius: 0,
              tension: 0,
              fill: false,
            },
          ]
        : []),
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(10, 14, 26, 0.95)',
        titleColor: 'rgba(255,255,255,0.7)',
        bodyColor: '#fff',
        borderColor: hexToRgba(color, 0.3),
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        titleFont: { size: 11, weight: 'normal' as const },
        bodyFont: { size: 13, weight: 'bold' as const },
        displayColors: false,
        callbacks: {
          title: function (items: any[]) {
            return `Time: ${items[0].label}s`;
          },
          label: function (context: any) {
            if (context.datasetIndex === 1) return `Threshold: ${context.parsed.y} ${unit}`;
            return `${title}: ${context.parsed.y.toFixed(3)} ${unit}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time (s)',
          color: 'rgba(255,255,255,0.25)',
          font: { size: 10 },
        },
        grid: {
          color: 'rgba(255,255,255,0.03)',
        },
        ticks: {
          color: 'rgba(255,255,255,0.2)',
          maxTicksLimit: 8,
          font: { size: 10 },
        },
        border: {
          color: 'rgba(255,255,255,0.05)',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: unit,
          color: 'rgba(255,255,255,0.25)',
          font: { size: 10 },
        },
        grid: {
          color: 'rgba(255,255,255,0.03)',
        },
        ticks: {
          color: 'rgba(255,255,255,0.2)',
          font: { size: 10 },
        },
        border: {
          color: 'rgba(255,255,255,0.05)',
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  // Compute quick stats
  const min = Math.min(...data).toFixed(3);
  const max = Math.max(...data).toFixed(3);
  const avg = (data.reduce((a, b) => a + b, 0) / data.length).toFixed(3);

  return (
    <div className="group overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:border-white/[0.1]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.04] px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {description && (
              <p className="text-[11px] text-white/30">{description}</p>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-white/25">Min</p>
            <p className="text-xs font-mono text-white/50">{min}</p>
          </div>
          <div className="h-6 w-px bg-white/[0.06]" />
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-white/25">Avg</p>
            <p className="text-xs font-mono text-white/50">{avg}</p>
          </div>
          <div className="h-6 w-px bg-white/[0.06]" />
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-white/25">Max</p>
            <p className="text-xs font-mono text-white/50">{max}</p>
          </div>
        </div>
      </div>

      {/* Chart body */}
      <div className="px-4 pb-4 pt-2">
        <div className="h-[260px]">
          <Line ref={chartRef} data={chartData as any} options={options} />
        </div>
      </div>

      {/* Threshold bar */}
      {threshold && (
        <div className="border-t border-white/[0.04] px-6 py-2.5 flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
          <span className="text-[10px] font-mono text-red-400/60">
            Threshold: {threshold} {unit}
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
        </div>
      )}
    </div>
  );
}
