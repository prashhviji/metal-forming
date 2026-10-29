'use client';

import { useEffect, useMemo, useState } from 'react';
import { Droplets, Download, History, Save, Square, Zap } from 'lucide-react';
import { BarChart } from '@/components/charts/bar-chart';
import { MqlBadge, mqlRuleText } from '@/components/mql-status';
import { useLive } from '@/components/live-provider';
import { useToast } from '@/components/toast';
import {
  Button,
  EmptyState,
  NumberField,
  Page,
  PageHeader,
  PageLoader,
  Panel,
  PanelHeader,
  Pill,
  StatTile,
  Switch,
} from '@/components/ui/kit';
import { sendJson, usePoll } from '@/lib/client/use-poll';
import { fmtClock, fmtDateTime, fmtNum } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { LubricationResponse, MqlConfig } from '@/types/monitor';

type Draft = Record<keyof Omit<MqlConfig, 'enabled'>, string>;

const toDraft = (c: MqlConfig): Draft => ({
  activationTemp: String(c.activationTemp),
  sprayDuration: String(c.sprayDuration),
  cooldown: String(c.cooldown),
  flowRate: String(c.flowRate),
});

function TemperatureGauge({ temp, activation, limit }: { temp: number | null; activation: number; limit: number }) {
  const lo = Math.max(0, Math.floor(activation - 20));
  const hi = Math.ceil(Math.max(limit, activation) + 5);
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100))}%`;
  const hot = temp !== null && temp >= activation;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-xs">
        <span className="text-white/60">Spindle temperature</span>
        <span className={cn('font-mono text-sm font-semibold', hot ? 'text-amber-300' : 'text-white')}>{temp === null ? '—' : `${temp.toFixed(1)} °C`}</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-white/[0.07]">
        {temp !== null && (
          <div className={cn('h-full rounded-full transition-all duration-500', hot ? 'bg-amber-400' : 'bg-emerald-400')} style={{ width: pos(temp) }} />
        )}
        <span className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-sky-300" style={{ left: pos(activation) }} aria-hidden />
        <span className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-red-400" style={{ left: pos(limit) }} aria-hidden />
      </div>
      <div className="relative mt-1.5 h-4 text-[11px] text-white/55">
        {/* The lower marker's label sits to its left, the higher one's to its right, so close values don't collide. */}
        <span
          className={cn('absolute whitespace-nowrap text-sky-300', activation <= limit ? '-translate-x-full pr-1' : 'pl-1')}
          style={{ left: pos(activation) }}
        >
          MQL {activation}°
        </span>
        <span
          className={cn('absolute whitespace-nowrap text-red-300', activation <= limit ? 'pl-1' : '-translate-x-full pr-1')}
          style={{ left: pos(limit) }}
        >
          Alert {limit}°
        </span>
      </div>
    </div>
  );
}

export default function LubricationPage() {
  const { status, refresh } = useLive();
  const toast = useToast();
  const lube = usePoll<LubricationResponse>('/api/lubrication', 2000);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const config = lube.data?.config;
  useEffect(() => {
    if (config && !dirty) setDraft(toDraft(config));
  }, [config, dirty]);

  const chart = useMemo(() => {
    const a = lube.data?.activity ?? [];
    return {
      labels: a.map((x) => fmtClock(x.ts, false)),
      datasets: [{ label: 'Spray cycles', color: '#38bdf8', data: a.map((x) => x.activations) }],
    };
  }, [lube.data?.activity]);

  if (!status || !lube.data || !draft) return <PageLoader label="Loading lubrication data…" />;

  const d = lube.data;
  const spraying = d.state.phase === 'spraying';

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try {
      await fn();
      await Promise.all([lube.refresh(), refresh()]);
      toast(ok, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Action failed', 'error');
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    run(
      'save',
      async () => {
        await sendJson('PUT', '/api/settings', {
          mql: {
            activationTemp: Number(draft.activationTemp),
            sprayDuration: Number(draft.sprayDuration),
            cooldown: Number(draft.cooldown),
            flowRate: Number(draft.flowRate),
          },
        });
        setDirty(false);
      },
      'MQL parameters saved'
    );

  const set = (k: keyof Draft) => (v: string) => {
    setDraft({ ...draft, [k]: v });
    setDirty(true);
  };

  return (
    <Page>
      <PageHeader
        icon={Droplets}
        tone="info"
        title="MQL lubrication control"
        description="Minimum quantity lubrication: a fine lubricant/air spray, triggered when the machine runs hot"
        actions={
          <a
            href="/api/export?kind=lubrication&range=all"
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 text-xs font-medium text-white transition-colors hover:bg-white/[0.1]"
          >
            <Download className="h-4 w-4" aria-hidden />
            CSV
          </a>
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Control */}
        <Panel tone={spraying ? 'info' : undefined} className="lg:col-span-2">
          <PanelHeader title="Control" />
          <div className="space-y-6 p-5">
            <MqlBadge state={d.state} size="lg" />

            <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">Automatic control</p>
                <p className="mt-0.5 text-xs text-white/55">{mqlRuleText(d.config)}</p>
              </div>
              <Switch
                checked={d.state.enabled}
                label="Automatic MQL control"
                disabled={busy === 'auto'}
                onChange={(enabled) =>
                  run('auto', () => sendJson('PUT', '/api/settings', { mql: { enabled } }), enabled ? 'Automatic control enabled' : 'Automatic control disabled')
                }
              />
            </div>

            <TemperatureGauge temp={d.latestTemp} activation={d.config.activationTemp} limit={status.thresholds.temperature} />

            <div className="flex flex-wrap gap-2">
              {spraying ? (
                <Button variant="danger" icon={Square} loading={busy === 'stop'} onClick={() => run('stop', () => sendJson('POST', '/api/lubrication', { action: 'stop' }), 'Spray stopped')}>
                  Stop spray
                </Button>
              ) : (
                <Button variant="primary" icon={Zap} loading={busy === 'spray'} onClick={() => run('spray', () => sendJson('POST', '/api/lubrication', { action: 'spray_now' }), `Spraying for ${d.config.sprayDuration}s`)}>
                  Spray now
                </Button>
              )}
              <span className="self-center text-xs text-white/50">Manual spray works even when automatic control is off.</span>
            </div>
          </div>
        </Panel>

        {/* Totals + parameters */}
        <div className="space-y-4 lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Activation temp" value={`${d.config.activationTemp} °C`} sub="spray starts at or above" />
            <StatTile label="Spray duration" value={`${d.config.sprayDuration} s`} sub={`${d.config.cooldown}s cooldown`} />
            <StatTile label="Total activations" value={d.totals.activations} tone="info" sub={`${d.totals.auto} auto · ${d.totals.manual} manual`} />
            <StatTile label="Lubricant used" value={`${fmtNum(d.totals.volumeMl, 1)} ml`} sub="estimated, not measured" />
          </div>

          <Panel>
            <PanelHeader title="Control parameters" description="Applied immediately; the sensor node receives the valve state with every reading" />
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
              <NumberField id="activationTemp" label="Activation temperature" unit="°C" value={draft.activationTemp} onChange={set('activationTemp')} min={20} max={200} step={0.5} />
              <NumberField id="sprayDuration" label="Spray duration" unit="s" value={draft.sprayDuration} onChange={set('sprayDuration')} min={1} max={600} />
              <NumberField id="cooldown" label="Cooldown" unit="s" value={draft.cooldown} onChange={set('cooldown')} min={0} max={3600} hint="Minimum gap between automatic sprays" />
              <NumberField id="flowRate" label="Nozzle flow" unit="ml/s" value={draft.flowRate} onChange={set('flowRate')} min={0.001} max={10} step={0.01} hint="Used to estimate consumption" />
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
              <p className="text-xs text-white/55">
                Lubricant volume is <strong className="font-medium text-white/75">duration × nozzle flow</strong>. Calibrate the flow against a measured amount before quoting savings.
              </p>
              <div className="flex gap-2">
                {dirty && (
                  <Button size="sm" variant="ghost" onClick={() => { setDraft(toDraft(d.config)); setDirty(false); }}>
                    Reset
                  </Button>
                )}
                <Button size="sm" variant="primary" icon={Save} disabled={!dirty} loading={busy === 'save'} onClick={save}>
                  Save
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Panel>
        <PanelHeader
          title="Lubrication activity — last hour"
          description={`${d.lastHour.activations} spray cycle${d.lastHour.activations === 1 ? '' : 's'} · about ${fmtNum(d.lastHour.volumeMl, 1)} ml`}
        />
        <div className="p-4">
          <BarChart labels={chart.labels} datasets={chart.datasets} yLabel="cycles per 5 min" ariaLabel="MQL spray cycles per five minutes over the last hour" height={200} />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Spray log" description="Most recent 30 cycles" icon={History} />
        {d.events.length === 0 ? (
          <EmptyState icon={Droplets} title="No spray cycles yet" description="Cycles are logged when the temperature reaches the activation value or you spray manually." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-white/55">
                  <th className="px-5 py-2.5 font-medium">Started</th>
                  <th className="px-3 py-2.5 font-medium">Trigger</th>
                  <th className="px-3 py-2.5 text-right font-medium">Temp at start</th>
                  <th className="px-3 py-2.5 text-right font-medium">Duration</th>
                  <th className="px-3 py-2.5 text-right font-medium">Est. volume</th>
                  <th className="px-5 py-2.5 font-medium">State</th>
                </tr>
              </thead>
              <tbody>
                {d.events.map((e) => (
                  <tr key={e.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-white/75">{fmtDateTime(e.startedAt)}</td>
                    <td className="px-3 py-3">
                      <Pill tone={e.trigger === 'auto' ? 'info' : 'accent'}>{e.trigger === 'auto' ? 'Automatic' : 'Manual'}</Pill>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-white/85">{e.tempAtStart === null ? '—' : `${e.tempAtStart.toFixed(1)} °C`}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-white/85">{e.endedAt ? `${fmtNum(e.durationS, 1)} s` : '—'}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-white/85">{e.endedAt ? `${fmtNum(e.volumeMl, 2)} ml` : '—'}</td>
                    <td className="px-5 py-3">
                      {e.endedAt ? (
                        <Pill tone="ok">Completed</Pill>
                      ) : (
                        <Pill tone="info" dot pulse>
                          Spraying
                        </Pill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-white/60">
        <strong className="font-medium text-white/80">Hardware status:</strong> the physical MQL set-up is still being assembled and validated. In
        {status.source === 'simulator' ? ' simulator mode a spray cools the simulated spindle so the control loop can be demonstrated' : ' hardware mode the server returns the valve command (on / off) in the response to each reading'}
        . Treat the spray log and volumes as logic checks until measured against the real nozzle.
      </p>
    </Page>
  );
}
