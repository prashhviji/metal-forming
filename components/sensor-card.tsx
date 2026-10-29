'use client';

import { Activity, Thermometer, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Sparkline } from '@/components/charts/sparkline';
import { Pill, TONE, type Tone } from '@/components/ui/kit';
import { SENSORS } from '@/lib/sensors';
import { cn } from '@/lib/utils';
import type { SensorKey } from '@/types/monitor';

export const SENSOR_ICONS: Record<SensorKey, LucideIcon> = {
  temperature: Thermometer,
  vibration: Activity,
  current: Zap,
};

export function sensorStatus(value: number, limit: number): { tone: Tone; label: string } {
  if (value > limit) return { tone: 'danger', label: 'Over limit' };
  if (value >= limit * 0.9) return { tone: 'warn', label: 'Near limit' };
  return { tone: 'ok', label: 'Normal' };
}

interface Props {
  sensor: SensorKey;
  value: number | null;
  limit: number;
  history: number[];
  /** Optional extra line, e.g. min / avg / max for a range. */
  footer?: React.ReactNode;
  size?: 'md' | 'lg';
}

export function SensorCard({ sensor, value, limit, history, footer, size = 'md' }: Props) {
  const meta = SENSORS[sensor];
  const Icon = SENSOR_ICONS[sensor];
  const status = value === null ? null : sensorStatus(value, limit);
  const tone = status ? TONE[status.tone] : TONE.neutral;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-white/[0.025] p-5 transition-colors',
        status?.tone === 'danger' ? 'border-red-500/40 bg-red-500/[0.04]' : 'border-white/[0.08]'
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" style={{ color: meta.color }} aria-hidden />
          <span className="whitespace-nowrap text-sm font-medium text-white/80">{meta.label}</span>
        </div>
        {status && (
          <Pill tone={status.tone} dot pulse={status.tone === 'danger'}>
            {status.label}
          </Pill>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className={cn('font-semibold tabular-nums tracking-tight text-white', size === 'lg' ? 'text-5xl' : 'text-4xl', status?.tone === 'danger' && tone.text)}>
          {value === null ? '—' : value.toFixed(meta.decimals)}
        </span>
        <span className="text-base text-white/55">{meta.unit}</span>
      </div>

      <div className="mt-3 -mx-1">
        <Sparkline values={history} color={meta.color} limit={limit} height={size === 'lg' ? 64 : 48} />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-white/55">
        <span className="whitespace-nowrap">
          Limit <span className="font-mono text-white/75">{limit.toFixed(meta.decimals > 2 ? 2 : 1)} {meta.unit}</span>
        </span>
        {footer}
      </div>
    </div>
  );
}
