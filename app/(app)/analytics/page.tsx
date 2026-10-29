'use client';

import { useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock, Droplets, Info, ShieldCheck, TriangleAlert } from 'lucide-react';
import { BarChart } from '@/components/charts/bar-chart';
import { Page, PageHeader, PageLoader, Panel, PanelHeader, Segmented, StatTile, TONE } from '@/components/ui/kit';
import { usePoll } from '@/lib/client/use-poll';
import { fmtClock, fmtDuration, fmtNum } from '@/lib/format';
import { SENSORS, SENSOR_KEYS } from '@/lib/sensors';
import { cn } from '@/lib/utils';
import type { AnalyticsResponse, RangeKey, SensorKey } from '@/types/monitor';

const RANGES: { value: RangeKey; label: string }[] = [
  { value: '15m', label: '15 min' },
  { value: '1h', label: '1 hour' },
  { value: '6h', label: '6 hours' },
  { value: '24h', label: '24 hours' },
];

const LEVEL_ICON = { ok: CheckCircle2, info: Info, warn: TriangleAlert } as const;
const LEVEL_TONE = { ok: 'ok', info: 'info', warn: 'warn' } as const;

function CorrelationCell({ r }: { r: number | null }) {
  if (r === null) return <div className="flex h-14 items-center justify-center rounded-lg bg-white/[0.03] text-xs text-white/40">n/a</div>;
  const strength = Math.abs(r);
  const positive = r >= 0;
  return (
    <div
      className="flex h-14 items-center justify-center rounded-lg font-mono text-sm font-semibold text-white"
      style={{ backgroundColor: positive ? `rgba(56,189,248,${0.08 + strength * 0.55})` : `rgba(251,146,60,${0.08 + strength * 0.55})` }}
      title={`r = ${r.toFixed(3)}`}
    >
      {r.toFixed(2)}
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey>('1h');
  const { data, loading } = usePoll<AnalyticsResponse>(`/api/analytics?range=${range}`, 10000);

  const chart = useMemo(() => {
    const a = data?.alertsByBucket ?? [];
    const withSeconds = range === '15m';
    return {
      labels: a.map((x) => fmtClock(x.ts, withSeconds)),
      datasets: SENSOR_KEYS.map((k) => ({ label: SENSORS[k].label, color: SENSORS[k].color, data: a.map((x) => x[k]) })),
    };
  }, [data?.alertsByBucket, range]);

  if (!data && loading) return <PageLoader label="Crunching the numbers…" />;
  if (!data) return <PageLoader label="Waiting for the server…" />;

  const totalAlerts = Object.values(data.alertTotals).reduce((a, b) => a + b, 0);
  const compTone = data.samples === 0 ? 'neutral' : data.compliancePct >= 99 ? 'ok' : data.compliancePct >= 95 ? 'warn' : 'danger';

  return (
    <Page>
      <PageHeader
        icon={BarChart3}
        tone="accent"
        title="Analytics"
        description="Statistics, trends and alert patterns computed from the stored readings"
        actions={<Segmented label="Analysis window" value={range} onChange={setRange} options={RANGES} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Clock} label="Samples analysed" value={data.samples.toLocaleString()} sub={`${fmtClock(data.from, false)} – ${fmtClock(data.to, false)} (${fmtDuration(data.to - data.from)})`} />
        <StatTile icon={ShieldCheck} label="Samples within all limits" value={`${fmtNum(data.compliancePct, 1)}%`} tone={compTone} sub="vibration, temperature and current together" />
        <StatTile icon={TriangleAlert} label="Threshold alerts" value={totalAlerts} tone={totalAlerts > 0 ? 'warn' : 'ok'} sub={SENSOR_KEYS.map((k) => `${data.alertTotals[k]} ${SENSORS[k].label.split(' ')[0].toLowerCase()}`).join(' · ')} />
        <StatTile icon={Droplets} label="MQL spray cycles" value={data.mqlCycles.total} tone={data.mqlCycles.total > 0 ? 'info' : 'neutral'} sub={`${data.mqlCycles.auto} automatic · ${data.mqlCycles.total - data.mqlCycles.auto} manual`} />
      </div>

      {/* Per-sensor statistics */}
      <Panel>
        <PanelHeader title="Sensor statistics" description="Computed over every stored sample in the window" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs text-white/55">
                <th className="px-5 py-2.5 font-medium">Sensor</th>
                <th className="px-3 py-2.5 text-right font-medium">Mean</th>
                <th className="px-3 py-2.5 text-right font-medium">Std dev</th>
                <th className="px-3 py-2.5 text-right font-medium">Min</th>
                <th className="px-3 py-2.5 text-right font-medium">Max</th>
                <th className="px-3 py-2.5 text-right font-medium">95th pct</th>
                <th className="px-3 py-2.5 text-right font-medium">Limit</th>
                <th className="px-3 py-2.5 text-right font-medium">Over limit</th>
                <th className="px-5 py-2.5 text-right font-medium">Trend / hour</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[13px] tabular-nums">
              {SENSOR_KEYS.map((k) => {
                const m = SENSORS[k];
                const s = data.stats[k];
                const f = (v: number) => v.toFixed(m.decimals);
                return (
                  <tr key={k} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-3.5 font-sans">
                      <span className="flex items-center gap-2.5 text-white">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                        {m.label} <span className="text-white/50">({m.unit})</span>
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right text-white/90">{f(s.mean)}</td>
                    <td className="px-3 py-3.5 text-right text-white/70">{f(s.std)}</td>
                    <td className="px-3 py-3.5 text-right text-white/70">{f(s.min)}</td>
                    <td className={cn('px-3 py-3.5 text-right', s.max > data.thresholds[k] ? 'font-semibold text-red-300' : 'text-white/90')}>{f(s.max)}</td>
                    <td className="px-3 py-3.5 text-right text-white/70">{f(s.p95)}</td>
                    <td className="px-3 py-3.5 text-right text-white/55">{f(data.thresholds[k])}</td>
                    <td className={cn('px-3 py-3.5 text-right', s.exceedancePct > 0 ? 'text-red-300' : 'text-emerald-300')}>{s.exceedancePct.toFixed(2)}%</td>
                    <td className="px-5 py-3.5 text-right text-white/70">
                      {s.slopePerHour === null
                        ? 'n/a'
                        : Math.abs(s.slopePerHour) < 0.5 * 10 ** -(m.decimals + 1)
                        ? `≈ 0 ${m.unit}`
                        : `${s.slopePerHour > 0 ? '+' : ''}${s.slopePerHour.toFixed(m.decimals + 1)} ${m.unit}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader title="Threshold alerts over time" description="Number of new alerts raised in each time slot" />
          <div className="p-4">
            {totalAlerts === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-white/55">No threshold alerts in this window.</div>
            ) : (
              <BarChart labels={chart.labels} datasets={chart.datasets} stacked showLegend height={240} yLabel="alerts" ariaLabel="Threshold alerts raised over time, stacked by sensor" />
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Sensor correlation" description="Pearson r between sensor channels" />
          <div className="p-5">
            <div className="grid grid-cols-[auto_repeat(3,1fr)] items-center gap-2">
              <span />
              {SENSOR_KEYS.map((k) => (
                <span key={k} className="text-center text-[11px] font-medium text-white/60">
                  {SENSORS[k].label.replace('Motor current', 'Current')}
                </span>
              ))}
              {SENSOR_KEYS.map((row) => (
                <div key={row} className="contents">
                  <span className="pr-1 text-[11px] font-medium text-white/60">{SENSORS[row].label.replace('Motor current', 'Current')}</span>
                  {SENSOR_KEYS.map((col: SensorKey) => (
                    <CorrelationCell key={col} r={data.correlation[row][col]} />
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-white/55">
              Values near 1 mean two sensors rise and fall together. Correlation shows association, not cause.
            </p>
          </div>
        </Panel>
      </div>

      {/* Observations */}
      <Panel>
        <PanelHeader title="Observations" description="Plain-language readout of the numbers above" />
        <ul className="divide-y divide-white/[0.05]">
          {data.observations.map((o, i) => {
            const Icon = LEVEL_ICON[o.level];
            const tone = TONE[LEVEL_TONE[o.level]];
            return (
              <li key={i} className="flex items-start gap-3 px-5 py-3.5">
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone.text)} aria-hidden />
                <p className="text-sm leading-relaxed text-white/85">{o.text}</p>
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="flex gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/50" aria-hidden />
        <p className="text-xs leading-relaxed text-white/60">
          <strong className="font-medium text-white/80">What this is — and isn&apos;t.</strong> These figures are descriptive statistics and fixed-threshold checks. The app does not
          predict failures, remaining tool life or cost savings. Models trained on simulated data are compared on the ML Models page, but none has been validated on the real
          machine. Fault-detection accuracy, false-alarm rate and alert response time still need to be measured in repeatable tests (see About).
        </p>
      </div>
    </Page>
  );
}
