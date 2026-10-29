'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartDataset, ChartOptions, ScriptableContext, ScriptableLineSegmentContext } from 'chart.js';
import { AXIS_TEXT, DANGER, GRID, TOOLTIP, hexToRgba } from './chart-setup';
import { fmtClock } from '@/lib/format';
import { SENSORS } from '@/lib/sensors';
import type { Reading, SensorKey } from '@/types/monitor';

interface SensorChartProps {
  sensor: SensorKey;
  points: Reading[];
  limit: number;
  bucketMs: number;
  height?: number;
}

/** Single-sensor time series. Segments above the alert limit turn red. */
export function SensorChart({ sensor, points, limit, bucketMs, height = 240 }: SensorChartProps) {
  const meta = SENSORS[sensor];
  const withSeconds = bucketMs < 60_000;

  const { data, options } = useMemo(() => {
    const labels = points.map((p) => fmtClock(p.ts, withSeconds));
    const values = points.map((p) => p[sensor]);

    const lo = Math.min(...values, limit);
    const hi = Math.max(...values, limit);
    const span = hi - lo || 1;
    const yMin = Math.max(0, lo - span * 0.15);
    const yMax = hi + span * 0.12;

    const datasets: ChartDataset<'line'>[] = [
        {
          label: meta.label,
          data: values,
          borderColor: meta.color,
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: meta.color,
          fill: true,
          backgroundColor: (ctx: ScriptableContext<'line'>) => {
            const { chartArea, ctx: c } = ctx.chart;
            if (!chartArea) return 'transparent';
            const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, hexToRgba(meta.color, 0.22));
            g.addColorStop(1, hexToRgba(meta.color, 0));
            return g;
          },
          segment: {
            borderColor: (ctx: ScriptableLineSegmentContext) => ((ctx.p1.parsed.y ?? 0) > limit ? DANGER : meta.color),
          },
          order: 1,
        },
        {
          label: 'Limit',
          data: values.map(() => limit),
          borderColor: 'rgba(248,113,113,0.65)',
          borderDash: [6, 4],
          borderWidth: 1.25,
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          order: 2,
        },
    ];
    const data = { labels, datasets };

    const options: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...TOOLTIP,
          displayColors: false,
          callbacks: {
            label: (c) =>
              c.datasetIndex === 1
                ? `Limit: ${limit.toFixed(meta.decimals)} ${meta.unit}`
                : `${meta.label}: ${(c.parsed.y ?? 0).toFixed(meta.decimals)} ${meta.unit}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: GRID },
          border: { display: false },
          ticks: { color: AXIS_TEXT, maxTicksLimit: 7, maxRotation: 0, autoSkip: true },
        },
        y: {
          min: yMin,
          max: yMax,
          grid: { color: GRID },
          border: { display: false },
          ticks: { color: AXIS_TEXT, maxTicksLimit: 6, callback: (v) => Number(v).toFixed(meta.decimals > 2 ? 2 : 1) },
          title: { display: true, text: meta.unit, color: AXIS_TEXT },
        },
      },
    };

    return { data, options };
  }, [points, limit, meta, withSeconds, sensor]);

  return (
    <div style={{ height }} role="img" aria-label={`${meta.label} over time, limit ${limit} ${meta.unit}`}>
      <Line data={data} options={options} />
    </div>
  );
}
