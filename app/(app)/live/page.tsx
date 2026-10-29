'use client';

import { useMemo, useState } from 'react';
import { Activity, Download, Pause, Play, TriangleAlert } from 'lucide-react';
import { SensorChart } from '@/components/charts/sensor-chart';
import { SensorCard } from '@/components/sensor-card';
import { useLive } from '@/components/live-provider';
import { Button, EmptyState, Page, PageHeader, PageLoader, Panel, PanelHeader, Segmented } from '@/components/ui/kit';
import { usePoll } from '@/lib/client/use-poll';
import { fmtClock, fmtDuration } from '@/lib/format';
import { SENSORS, SENSOR_KEYS } from '@/lib/sensors';
import type { RangeKey, SeriesResponse } from '@/types/monitor';

const RANGES: { value: RangeKey; label: string }[] = [
  { value: '5m', label: '5 min' },
  { value: '15m', label: '15 min' },
  { value: '1h', label: '1 hour' },
  { value: '6h', label: '6 hours' },
  { value: '24h', label: '24 hours' },
];

export default function LiveDataPage() {
  const { status } = useLive();
  const [range, setRange] = useState<RangeKey>('15m');
  const [frozen, setFrozen] = useState(false);
  const series = usePoll<SeriesResponse>(`/api/readings?range=${range}`, 2000, frozen);

  const points = series.data?.points ?? [];
  const bucketMs = series.data?.bucketMs ?? 1000;
  const peakMode = bucketMs > 1500;

  const stats = useMemo(() => {
    return Object.fromEntries(
      SENSOR_KEYS.map((k) => {
        const vals = points.map((p) => p[k]);
        const sum = vals.reduce((a, b) => a + b, 0);
        return [k, vals.length ? { min: Math.min(...vals), max: Math.max(...vals), avg: sum / vals.length } : null];
      })
    );
  }, [points]);

  if (!status || (series.loading && !series.data)) return <PageLoader label="Loading sensor data…" />;

  const latestPoint = points[points.length - 1];
  const recent = points.slice(-10).reverse();

  return (
    <Page>
      <PageHeader
        icon={Activity}
        tone="ok"
        title="Live sensor data"
        description={
          frozen && latestPoint
            ? `Paused — showing data up to ${fmtClock(latestPoint.ts)}`
            : `Temperature, vibration and motor current · ${peakMode ? `peak per ${fmtDuration(bucketMs)}` : 'raw samples'}`
        }
        actions={
          <>
            <Segmented label="Time range" value={range} onChange={setRange} options={RANGES} />
            <Button size="sm" icon={frozen ? Play : Pause} onClick={() => setFrozen((f) => !f)}>
              {frozen ? 'Resume' : 'Pause'}
            </Button>
            <a
              href={`/api/export?kind=readings&range=${range}`}
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 text-xs font-medium text-white transition-colors hover:bg-white/[0.1]"
            >
              <Download className="h-4 w-4" aria-hidden />
              CSV
            </a>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {SENSOR_KEYS.map((k) => {
          const s = stats[k];
          return (
            <SensorCard
              key={k}
              sensor={k}
              size="lg"
              value={latestPoint ? latestPoint[k] : null}
              limit={status.thresholds[k]}
              history={points.slice(-60).map((p) => p[k])}
              footer={
                s ? (
                  <span className="whitespace-nowrap font-mono text-white/60">
                    {s.min.toFixed(SENSORS[k].decimals)} / {s.avg.toFixed(SENSORS[k].decimals)} / {s.max.toFixed(SENSORS[k].decimals)}
                  </span>
                ) : undefined
              }
            />
          );
        })}
      </div>
      <p className="-mt-2 text-xs text-white/50">Footer on each card: min / average / max over the selected range.</p>

      {points.length < 2 ? (
        <Panel>
          <EmptyState icon={TriangleAlert} title="Not enough readings in this range" description="Choose a longer range or wait for more samples to arrive." />
        </Panel>
      ) : (
        <div className="space-y-4">
          {SENSOR_KEYS.map((k) => (
            <Panel key={k}>
              <PanelHeader
                title={SENSORS[k].label}
                description={SENSORS[k].blurb}
                actions={
                  <span className="flex items-center gap-2 text-xs text-white/60">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SENSORS[k].color }} />
                    Limit {status.thresholds[k]} {SENSORS[k].unit}
                  </span>
                }
              />
              <div className="p-4">
                <SensorChart sensor={k} points={points} limit={status.thresholds[k]} bucketMs={bucketMs} />
              </div>
            </Panel>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <Panel>
          <PanelHeader title="Latest samples" description={peakMode ? `Peak value in each ${fmtDuration(bucketMs)} bucket` : 'Most recent raw readings'} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-white/55">
                  <th className="px-5 py-2.5 font-medium">Time</th>
                  {SENSOR_KEYS.map((k) => (
                    <th key={k} className="px-5 py-2.5 text-right font-medium">
                      {SENSORS[k].label} ({SENSORS[k].unit})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono text-[13px]">
                {recent.map((p) => (
                  <tr key={p.ts} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-2 text-white/70">{fmtClock(p.ts)}</td>
                    {SENSOR_KEYS.map((k) => (
                      <td key={k} className={`px-5 py-2 text-right tabular-nums ${p[k] > status.thresholds[k] ? 'font-semibold text-red-300' : 'text-white/85'}`}>
                        {p[k].toFixed(SENSORS[k].decimals)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </Page>
  );
}
