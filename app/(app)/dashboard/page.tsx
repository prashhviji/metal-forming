'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BellOff, CheckCircle2, Droplets, FlaskConical, LayoutDashboard, ShieldCheck, TriangleAlert } from 'lucide-react';
import { MultiSensorChart } from '@/components/charts/multi-sensor-chart';
import { SensorCard } from '@/components/sensor-card';
import { AlertTypeIcon, StatusPill } from '@/components/alert-bits';
import { MqlBadge, mqlRuleText } from '@/components/mql-status';
import { useLive } from '@/components/live-provider';
import { useToast } from '@/components/toast';
import {
  Button,
  EmptyState,
  Page,
  PageHeader,
  PageLoader,
  Panel,
  PanelHeader,
  Segmented,
  StatTile,
  Switch,
} from '@/components/ui/kit';
import { sendJson, usePoll } from '@/lib/client/use-poll';
import { fmtAgo, fmtNum } from '@/lib/format';
import { SENSORS, SENSOR_KEYS } from '@/lib/sensors';
import { cn } from '@/lib/utils';
import type {
  AlertsResponse,
  AnalyticsResponse,
  LubricationResponse,
  RangeKey,
  SensorKey,
  SeriesResponse,
} from '@/types/monitor';

const RANGES: { value: RangeKey; label: string }[] = [
  { value: '5m', label: '5 min' },
  { value: '15m', label: '15 min' },
  { value: '1h', label: '1 hour' },
];

export default function DashboardPage() {
  const { status, refresh } = useLive();
  const toast = useToast();
  const [range, setRange] = useState<RangeKey>('5m');
  const [visible, setVisible] = useState<Record<SensorKey, boolean>>({ temperature: true, vibration: true, current: true });
  const [busy, setBusy] = useState<string | null>(null);

  const series = usePoll<SeriesResponse>(`/api/readings?range=${range}`, 2000);
  const alerts = usePoll<AlertsResponse>('/api/alerts?limit=6', 3000);
  const lube = usePoll<LubricationResponse>('/api/lubrication', 3000);
  const analytics = usePoll<AnalyticsResponse>('/api/analytics?range=1h', 15000);

  const points = series.data?.points ?? [];
  const latest = status?.latest ?? null;
  const histories = useMemo(() => {
    const tail = points.slice(-60);
    return Object.fromEntries(SENSOR_KEYS.map((k) => [k, tail.map((p) => p[k])])) as Record<SensorKey, number[]>;
  }, [points]);

  if (!status) return <PageLoader label="Connecting to the monitor…" />;

  async function toggleAuto(enabled: boolean) {
    setBusy('auto');
    try {
      await sendJson('PUT', '/api/settings', { mql: { enabled } });
      await refresh();
      toast(enabled ? 'Automatic MQL control enabled' : 'Automatic MQL control disabled', 'info');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update MQL', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function injectFault() {
    setBusy('fault');
    try {
      await sendJson('POST', '/api/system', { action: 'inject_fault' });
      toast('Simulated fault started — watch the readings and alerts', 'info');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not start fault', 'error');
    } finally {
      setBusy(null);
    }
  }

  const alertsTotal = analytics.data ? Object.values(analytics.data.alertTotals).reduce((a, b) => a + b, 0) : null;
  const compliance = analytics.data?.compliancePct ?? null;

  return (
    <Page>
      <PageHeader
        icon={LayoutDashboard}
        tone="info"
        title="Machine dashboard"
        description={
          <>
            {status.machine.name} · {status.machine.type}
            {latest && <span className="text-white/40"> · last reading {fmtAgo(status.ageMs)}</span>}
          </>
        }
        actions={
          status.source === 'simulator' ? (
            <Button icon={FlaskConical} size="sm" loading={busy === 'fault'} onClick={injectFault}>
              Simulate fault
            </Button>
          ) : undefined
        }
      />

      {/* Live values */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SENSOR_KEYS.map((k) => (
          <SensorCard key={k} sensor={k} value={latest ? latest[k] : null} limit={status.thresholds[k]} history={histories[k]} />
        ))}

        <Panel tone={status.mql.phase === 'spraying' ? 'info' : undefined} className="flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-sky-300" aria-hidden />
              <span className="text-sm font-medium text-white/80">MQL lubrication</span>
            </div>
            <Switch checked={status.mql.enabled} onChange={toggleAuto} disabled={busy === 'auto'} label="Automatic MQL control" />
          </div>
          <MqlBadge state={status.mql} />
          <p className="mt-auto pt-4 text-xs text-white/55">{mqlRuleText(status.mqlConfig)}</p>
          <Link href="/lubrication" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-300 hover:text-sky-200">
            Lubrication control <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </Panel>
      </div>

      {/* Trend + alerts */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Live sensor trends"
            description="Each line is shown as a percentage of its alert limit — crossing 100% means a violation"
            actions={<Segmented label="Time range" value={range} onChange={setRange} options={RANGES} size="sm" />}
          />
          <div className="flex flex-wrap gap-2 px-5 pt-4">
            {SENSOR_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={visible[k]}
                onClick={() => setVisible((v) => ({ ...v, [k]: !v[k] }))}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  visible[k] ? 'border-white/15 bg-white/[0.06] text-white' : 'border-white/[0.07] text-white/45 hover:text-white/70'
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SENSORS[k].color, opacity: visible[k] ? 1 : 0.35 }} />
                {SENSORS[k].label}
                {latest && (
                  <span className="font-mono text-white/60">
                    {latest[k].toFixed(SENSORS[k].decimals)} {SENSORS[k].unit}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="p-4 pt-3">
            {series.data && points.length > 1 ? (
              <MultiSensorChart points={points} thresholds={series.data.thresholds} bucketMs={series.data.bucketMs} visible={visible} />
            ) : series.loading ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-white/50">Loading readings…</div>
            ) : (
              <EmptyState icon={TriangleAlert} title="No readings yet" description="Readings will appear here as soon as the sensors (or the simulator) report data." />
            )}
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <PanelHeader
            title="Recent alerts"
            description={
              status.alerts.active > 0
                ? `${status.alerts.active} active right now`
                : status.alerts.acknowledged > 0
                ? `${status.alerts.acknowledged} acknowledged, none new`
                : 'No open alerts'
            }
            actions={
              <Link href="/alerts" className="inline-flex items-center gap-1 text-xs font-medium text-sky-300 hover:text-sky-200">
                View all <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            }
          />
          {alerts.data && alerts.data.alerts.length > 0 ? (
            <ul className="divide-y divide-white/[0.05]">
              {alerts.data.alerts.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-white/70">
                    <AlertTypeIcon type={a.type} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-white">{a.message}</p>
                    <p className="mt-0.5 text-xs text-white/50">{fmtAgo(Date.now() - a.startedAt)}</p>
                  </div>
                  <StatusPill status={a.status} type={a.type} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={BellOff} title="No alerts recorded" description="Threshold violations and MQL activations will be listed here." />
          )}
        </Panel>
      </div>

      {/* Last hour summary */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-white/80">Last hour</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon={ShieldCheck}
            label="Samples within all limits"
            value={compliance === null ? '—' : `${fmtNum(compliance, 1)}%`}
            tone={compliance === null ? 'neutral' : compliance >= 99 ? 'ok' : compliance >= 95 ? 'warn' : 'danger'}
            sub={analytics.data ? `${analytics.data.samples.toLocaleString()} samples` : undefined}
          />
          <StatTile
            icon={TriangleAlert}
            label="Threshold alerts raised"
            value={alertsTotal ?? '—'}
            tone={alertsTotal ? 'warn' : alertsTotal === 0 ? 'ok' : 'neutral'}
            sub="vibration, temperature and current"
          />
          <StatTile icon={Droplets} label="MQL spray cycles" value={lube.data?.lastHour.activations ?? '—'} tone="info" sub="automatic and manual" />
          <StatTile
            icon={CheckCircle2}
            label="Lubricant used (estimated)"
            value={lube.data ? `${fmtNum(lube.data.lastHour.volumeMl, 1)} ml` : '—'}
            sub={`from ${status.mqlConfig.flowRate} ml/s nozzle flow setting`}
          />
        </div>
      </div>

      {status.source === 'simulator' && (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs leading-relaxed text-amber-100/80">
          <strong className="font-semibold text-amber-200">Simulated data.</strong> The values on this dashboard come from the built-in simulator, not from the
          machine&apos;s sensors. Switch to hardware in{' '}
          <Link href="/settings" className="underline underline-offset-2 hover:text-white">
            Settings
          </Link>{' '}
          once the sensor node is posting readings.
        </p>
      )}
    </Page>
  );
}
