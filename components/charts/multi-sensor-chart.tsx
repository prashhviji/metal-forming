'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartDataset, ChartOptions } from 'chart.js';
import { AXIS_TEXT, GRID, TOOLTIP } from './chart-setup';
import { fmtClock } from '@/lib/format';
import { SENSORS, SENSOR_KEYS } from '@/lib/sensors';
import type { Reading, SensorKey, Thresholds } from '@/types/monitor';

interface Props {
  points: Reading[];
  thresholds: Thresholds;
  bucketMs: number;
  visible: Record<SensorKey, boolean>;
  height?: number;
}

/**
 * All three sensors on one axis, each expressed as a percentage of its own alert limit.
 * 100 % is the limit, so any line crossing the dashed line is in violation.
 */
export function MultiSensorChart({ points, thresholds, bucketMs, visible, height = 300 }: Props) {
  const withSeconds = bucketMs < 60_000;

  const { data, options } = useMemo(() => {
    const labels = points.map((p) => fmtClock(p.ts, withSeconds));
    const datasets: ChartDataset<'line'>[] = SENSOR_KEYS.filter((k) => visible[k]).map((k) => ({
      label: SENSORS[k].label,
      data: points.map((p) => (p[k] / thresholds[k]) * 100),
      borderColor: SENSORS[k].color,
      borderWidth: 2,
      tension: 0.25,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHoverBackgroundColor: SENSORS[k].color,
      fill: false,
    }));
    datasets.push({
      label: 'Alert limit (100%)',
      data: points.map(() => 100),
      borderColor: 'rgba(248,113,113,0.7)',
      borderWidth: 1.25,
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0,
      fill: false,
      borderDash: [6, 4],
    });

    const options: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...TOOLTIP,
          itemSort: (a, b) => (b.parsed.y ?? 0) - (a.parsed.y ?? 0),
          callbacks: {
            label: (c) => {
              const key = SENSOR_KEYS.find((k) => SENSORS[k].label === c.dataset.label);
              if (!key) return `Alert limit`;
              const raw = ((c.parsed.y ?? 0) / 100) * thresholds[key];
              return `${SENSORS[key].label}: ${raw.toFixed(SENSORS[key].decimals)} ${SENSORS[key].unit} (${(c.parsed.y ?? 0).toFixed(0)}%)`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: GRID },
          border: { display: false },
          ticks: { color: AXIS_TEXT, maxTicksLimit: 8, maxRotation: 0, autoSkip: true },
        },
        y: {
          min: 0,
          suggestedMax: 130,
          grid: { color: GRID },
          border: { display: false },
          ticks: { color: AXIS_TEXT, callback: (v) => `${v}%`, maxTicksLimit: 7 },
        },
      },
    };
    return { data: { labels, datasets }, options };
  }, [points, thresholds, visible, withSeconds]);

  return (
    <div style={{ height }} role="img" aria-label="Temperature, vibration and motor current as a percentage of their alert limits">
      <Line data={data} options={options} />
    </div>
  );
}
