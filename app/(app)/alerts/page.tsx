'use client';

import { useState } from 'react';
import { BellOff, CheckCheck, Download, ShieldAlert } from 'lucide-react';
import { AlertTypeIcon, ALERT_TYPE_LABEL, SeverityPill, StatusPill } from '@/components/alert-bits';
import { useToast } from '@/components/toast';
import { Button, EmptyState, Page, PageHeader, PageLoader, Panel, PanelHeader, Segmented, StatTile } from '@/components/ui/kit';
import { sendJson, usePoll } from '@/lib/client/use-poll';
import { fmtDateTime, fmtDuration } from '@/lib/format';
import { SENSORS } from '@/lib/sensors';
import type { AlertRow, AlertsResponse, AlertType } from '@/types/monitor';

type StatusFilter = 'all' | 'open' | 'resolved';
type TypeFilter = 'all' | AlertType;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'vibration', label: 'Vibration' },
  { value: 'current', label: 'Current' },
  { value: 'lubrication', label: 'Lubrication' },
];

const PAGE_SIZE = 50;

function valueText(a: AlertRow): string {
  if (a.type === 'lubrication') return a.value === null ? '—' : `${a.value.toFixed(1)} °C`;
  const m = SENSORS[a.type];
  const peak = a.peak ?? a.value;
  return peak === null ? '—' : `${peak.toFixed(m.decimals)} ${m.unit}`;
}

function limitText(a: AlertRow): string {
  if (a.threshold === null) return '—';
  if (a.type === 'lubrication') return `${a.threshold} °C`;
  const m = SENSORS[a.type];
  return `${a.threshold.toFixed(m.decimals > 2 ? 2 : 1)} ${m.unit}`;
}

export default function AlertsPage() {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [busy, setBusy] = useState(false);

  const params = new URLSearchParams({ limit: String(limit) });
  if (statusFilter !== 'all') params.set('status', statusFilter);
  if (typeFilter !== 'all') params.set('type', typeFilter);
  const { data, loading, refresh } = usePoll<AlertsResponse>(`/api/alerts?${params}`, 3000);

  async function act(body: object, success: string) {
    setBusy(true);
    try {
      await sendJson('POST', '/api/alerts', body);
      await refresh();
      toast(success, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Action failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!data && loading) return <PageLoader label="Loading alerts…" />;

  const counts = data?.counts;
  const faults = counts ? counts.byType.temperature + counts.byType.vibration + counts.byType.current : 0;
  const openFaults = counts?.active ?? 0;

  return (
    <Page>
      <PageHeader
        icon={ShieldAlert}
        tone="danger"
        title="Alerts"
        description="Threshold violations and lubrication events, newest first"
        actions={
          <>
            <Button
              size="sm"
              icon={CheckCheck}
              disabled={openFaults === 0}
              loading={busy}
              onClick={() => act({ action: 'acknowledge_all' }, 'All active alerts acknowledged')}
            >
              Acknowledge all
            </Button>
            <a
              href="/api/export?kind=alerts&range=all"
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 text-xs font-medium text-white transition-colors hover:bg-white/[0.1]"
            >
              <Download className="h-4 w-4" aria-hidden />
              CSV
            </a>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active" value={openFaults} tone={openFaults > 0 ? 'danger' : 'ok'} sub={openFaults > 0 ? 'need attention' : 'nothing outstanding'} />
        <StatTile label="Acknowledged" value={counts?.acknowledged ?? 0} tone={(counts?.acknowledged ?? 0) > 0 ? 'warn' : 'neutral'} sub="still out of range" />
        <StatTile label="Resolved" value={counts?.resolved ?? 0} tone="ok" sub="back within limits" />
        <StatTile label="Threshold alerts, all time" value={faults} sub={`${counts?.bySeverity.Critical ?? 0} critical · ${counts?.bySeverity.High ?? 0} high · ${counts?.bySeverity.Medium ?? 0} medium`} />
      </div>

      <Panel>
        <PanelHeader
          title="Alert history"
          description={data ? `${data.total.toLocaleString()} matching ${data.total === 1 ? 'entry' : 'entries'}` : undefined}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Segmented label="Status filter" value={statusFilter} onChange={(v) => { setStatusFilter(v); setLimit(PAGE_SIZE); }} options={STATUS_OPTIONS} size="sm" />
              <select
                aria-label="Type filter"
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value as TypeFilter); setLimit(PAGE_SIZE); }}
                className="h-8 rounded-lg border border-white/12 bg-[#0b1020] px-2.5 text-xs font-medium text-white outline-none focus:border-sky-400/60"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        {!data || data.alerts.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title="No alerts match"
            description={statusFilter === 'all' && typeFilter === 'all' ? 'Nothing has crossed a threshold yet.' : 'Try a different filter.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-xs text-white/55">
                    <th className="px-5 py-2.5 font-medium">Time</th>
                    <th className="px-3 py-2.5 font-medium">Type</th>
                    <th className="px-3 py-2.5 font-medium">Message</th>
                    <th className="px-3 py-2.5 font-medium">Severity</th>
                    <th className="px-3 py-2.5 text-right font-medium">Peak / temp</th>
                    <th className="px-3 py-2.5 text-right font-medium">Limit</th>
                    <th className="px-3 py-2.5 text-right font-medium">Duration</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {data.alerts.map((a) => (
                    <tr key={a.id} className="border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.02]">
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-white/75">{fmtDateTime(a.startedAt)}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-2 text-white/85">
                          <AlertTypeIcon type={a.type} className="h-4 w-4 text-white/50" />
                          {ALERT_TYPE_LABEL[a.type]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-white">{a.message}</td>
                      <td className="px-3 py-3">
                        <SeverityPill severity={a.severity} />
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-white/85">{valueText(a)}</td>
                      <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-white/55">{limitText(a)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs tabular-nums text-white/65">
                        {a.resolvedAt ? fmtDuration(a.resolvedAt - a.startedAt) : 'ongoing'}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill status={a.status} type={a.type} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        {a.status === 'active' && a.type !== 'lubrication' && (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => act({ action: 'acknowledge', id: a.id }, 'Alert acknowledged')}>
                            Acknowledge
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.total > data.alerts.length && (
              <div className="border-t border-white/[0.06] p-3 text-center">
                <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                  Show more ({data.total - data.alerts.length} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </Panel>

      <p className="text-xs leading-relaxed text-white/50">
        Alerts use fixed limits (editable in Settings). An alert opens when a reading exceeds its limit and resolves after three consecutive readings back
        within it. Acknowledging records that someone has seen an alert; it stays open until the reading recovers.
      </p>
    </Page>
  );
}
