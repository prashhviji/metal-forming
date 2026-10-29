'use client';

import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { AXIS_TEXT, GRID, TOOLTIP } from './chart-setup';

interface Props {
  labels: string[];
  datasets: { label: string; color: string; data: number[] }[];
  stacked?: boolean;
  height?: number;
  yLabel?: string;
  /** Number of decimals shown on the y axis and in the tooltip. */
  decimals?: number;
  ariaLabel: string;
  showLegend?: boolean;
}

export function BarChart({ labels, datasets, stacked, height = 220, yLabel, decimals = 0, ariaLabel, showLegend }: Props) {
  const { data, options } = useMemo(() => {
    const data = {
      labels,
      datasets: datasets.map((d) => ({
        label: d.label,
        data: d.data,
        backgroundColor: d.color,
        borderRadius: 4,
        maxBarThickness: 28,
      })),
    };
    const options: ChartOptions<'bar'> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: showLegend
          ? { position: 'bottom', labels: { color: AXIS_TEXT, boxWidth: 10, boxHeight: 10, usePointStyle: true } }
          : { display: false },
        tooltip: {
          ...TOOLTIP,
          callbacks: { label: (c) => `${c.dataset.label}: ${(c.parsed.y ?? 0).toFixed(decimals)}` },
        },
      },
      scales: {
        x: { stacked, grid: { display: false }, border: { display: false }, ticks: { color: AXIS_TEXT, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
        y: {
          stacked,
          beginAtZero: true,
          grid: { color: GRID },
          border: { display: false },
          ticks: { color: AXIS_TEXT, precision: decimals, maxTicksLimit: 5 },
          title: yLabel ? { display: true, text: yLabel, color: AXIS_TEXT } : undefined,
        },
      },
    };
    return { data, options };
  }, [labels, datasets, stacked, yLabel, decimals, showLegend]);

  return (
    <div style={{ height }} role="img" aria-label={ariaLabel}>
      <Bar data={data} options={options} />
    </div>
  );
}
