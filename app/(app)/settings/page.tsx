'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Cpu, Database, Download, FlaskConical, Pause, Play, Save, Settings, SlidersHorizontal, Trash2, Wifi } from 'lucide-react';
import { useLive } from '@/components/live-provider';
import { useToast } from '@/components/toast';
import {
  Button,
  NumberField,
  Page,
  PageHeader,
  PageLoader,
  Panel,
  PanelHeader,
  Pill,
  Segmented,
  TextField,
} from '@/components/ui/kit';
import { sendJson, usePoll } from '@/lib/client/use-poll';
import { fmtBytes, fmtInt } from '@/lib/format';
import { SENSORS, SENSOR_KEYS } from '@/lib/sensors';
import type { AppSettings, DataSource, MachineInfo } from '@/types/monitor';

interface SettingsPayload {
  settings: AppSettings;
  machine: MachineInfo;
}

const INTERVALS = [
  { value: '500', label: '0.5 s' },
  { value: '1000', label: '1 s' },
  { value: '2000', label: '2 s' },
  { value: '5000', label: '5 s' },
];

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard unavailable (e.g. insecure context) — user can still select the text */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-white/12 bg-white/[0.05] px-2 py-1 text-[11px] font-medium text-white/80 hover:bg-white/[0.1]"
      aria-label={label}
    >
      {done ? <Check className="h-3 w-3 text-emerald-300" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/30">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
        <span className="text-[11px] font-medium text-white/60">{title}</span>
        <CopyButton text={code} label={`Copy ${title}`} />
      </div>
      <pre className="overflow-x-auto p-3 text-[12px] leading-relaxed text-white/85">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function SettingsPage() {
  const { status, refresh } = useLive();
  const toast = useToast();
  const remote = usePoll<SettingsPayload>('/api/settings', 30000);

  const [machine, setMachine] = useState<MachineInfo | null>(null);
  const [limits, setLimits] = useState<Record<string, string> | null>(null);
  const [dirty, setDirty] = useState({ machine: false, limits: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [seedHours, setSeedHours] = useState('1');
  const [origin, setOrigin] = useState('http://localhost:3000');

  useEffect(() => setOrigin(window.location.origin), []);

  const loaded = remote.data;
  useEffect(() => {
    if (!loaded) return;
    if (!dirty.machine) setMachine(loaded.machine);
    if (!dirty.limits) setLimits(Object.fromEntries(SENSOR_KEYS.map((k) => [k, String(loaded.settings.thresholds[k])])));
  }, [loaded, dirty]);

  if (!status || !loaded || !machine || !limits) return <PageLoader label="Loading settings…" />;

  const engine = loaded.settings.engine;

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try {
      await fn();
      await Promise.all([remote.refresh(), refresh()]);
      toast(ok, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong', 'error');
    } finally {
      setBusy(null);
    }
  }

  const saveMachine = () =>
    run('machine', async () => {
      await sendJson('PUT', '/api/settings', { machine: { name: machine.name, type: machine.type, location: machine.location } });
      setDirty((d) => ({ ...d, machine: false }));
    }, 'Machine profile saved');

  const saveLimits = () =>
    run('limits', async () => {
      await sendJson('PUT', '/api/settings', {
        thresholds: Object.fromEntries(SENSOR_KEYS.map((k) => [k, Number(limits[k])])),
      });
      setDirty((d) => ({ ...d, limits: false }));
    }, 'Alert limits saved');

  const setSource = (source: DataSource) =>
    run('source', () => sendJson('PUT', '/api/settings', { engine: { source } }), source === 'hardware' ? 'Now listening for hardware readings' : 'Switched to the built-in simulator');

  const hardware = engine.source === 'hardware';
  const endpoint = `${origin}/api/readings`;

  const curl = `curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '{"vibration":0.18,"temperature":39.5,"current":2.2}'`;

  const reply = `{
  "ok": true,
  "ts": 1793249356260,
  "mql": { "enabled": true, "valve": "off", "phase": "armed" },
  "alerts": { "active": 0 }
}`;

  const arduino = `// ESP32 — post one reading and drive the MQL valve from the reply
#include <WiFi.h>
#include <HTTPClient.h>

const char* SERVER = "${endpoint.replace('localhost', '<your-computer-ip>')}";
const int MQL_VALVE_PIN = 26;

void sendReading(float vib, float tempC, float amps) {
  HTTPClient http;
  http.begin(SERVER);
  http.addHeader("Content-Type", "application/json");
  String body = "{\\"vibration\\":" + String(vib, 3) +
                ",\\"temperature\\":" + String(tempC, 2) +
                ",\\"current\\":" + String(amps, 3) + "}";
  if (http.POST(body) == 200) {
    String res = http.getString();
    digitalWrite(MQL_VALVE_PIN, res.indexOf("\\"valve\\":\\"on\\"") >= 0 ? HIGH : LOW);
  }
  http.end();
}`;

  return (
    <Page className="max-w-[1100px]">
      <PageHeader icon={Settings} tone="neutral" title="Settings" description="Machine profile, alert limits, data source and the local database" />

      {/* Data source */}
      <Panel>
        <PanelHeader title="Data source" icon={Cpu} description="Where readings come from" />
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented<DataSource>
              label="Data source"
              value={engine.source}
              onChange={(v) => v !== engine.source && setSource(v)}
              options={[
                { value: 'simulator', label: 'Built-in simulator' },
                { value: 'hardware', label: 'Hardware sensors' },
              ]}
            />
            {busy === 'source' && <span className="text-xs text-white/55">Switching…</span>}
          </div>

          {!hardware ? (
            <div className="space-y-4">
              <p className="text-sm text-white/70">
                The simulator generates one reading per interval — normal machining with occasional fault episodes — and stores it in the database exactly like real data would be.
                Use it to develop and demo the dashboard before the sensor node is wired up.
              </p>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-white/70">Sample interval</p>
                  <Segmented
                    label="Sample interval"
                    size="sm"
                    value={String(engine.intervalMs)}
                    onChange={(v) => run('interval', () => sendJson('PUT', '/api/settings', { engine: { intervalMs: Number(v) } }), 'Sample interval updated')}
                    options={INTERVALS}
                  />
                </div>
                <Button
                  size="sm"
                  icon={engine.paused ? Play : Pause}
                  loading={busy === 'pause'}
                  onClick={() => run('pause', () => sendJson('PUT', '/api/settings', { engine: { paused: !engine.paused } }), engine.paused ? 'Simulator resumed' : 'Simulator paused')}
                >
                  {engine.paused ? 'Resume simulator' : 'Pause simulator'}
                </Button>
                <Button size="sm" icon={FlaskConical} loading={busy === 'fault'} onClick={() => run('fault', () => sendJson('POST', '/api/system', { action: 'inject_fault' }), 'Simulated fault started')}>
                  Simulate fault
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Wifi className="h-4 w-4 text-white/50" aria-hidden />
                <p className="text-sm text-white/70">Waiting for the sensor node to POST readings to</p>
                <code className="rounded-md bg-white/[0.07] px-2 py-0.5 font-mono text-xs text-white">{endpoint}</code>
                <Pill tone={status.link === 'live' ? 'ok' : status.link === 'stale' ? 'danger' : 'neutral'} dot>
                  {status.link === 'live' ? 'Receiving data' : status.link === 'stale' ? 'No recent data' : 'No data yet'}
                </Pill>
              </div>
              <p className="text-xs text-white/55">
                Replace <code className="font-mono">localhost</code> with this computer&apos;s network IP address so the microcontroller can reach it (same Wi-Fi), and start the app with{' '}
                <code className="font-mono">npm run dev -- -H 0.0.0.0</code>.
              </p>
            </div>
          )}

          <details className="group rounded-xl border border-white/[0.08] bg-white/[0.02] open:bg-white/[0.03]" open={hardware}>
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-white/85">How the sensor node connects</summary>
            <div className="space-y-4 border-t border-white/[0.06] p-4">
              <p className="text-sm text-white/65">
                Send one JSON reading per sample. The reply carries the lubrication valve command, so the node can open or close the MQL valve without any extra request. Hardware mode must be selected
                above — in simulator mode the endpoint answers <code className="font-mono">409</code>.
              </p>
              <CodeBlock title="Request (curl)" code={curl} />
              <CodeBlock title="Reply" code={reply} />
              <CodeBlock title="ESP32 / Arduino example" code={arduino} />
            </div>
          </details>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alert limits */}
        <Panel>
          <PanelHeader title="Alert limits" icon={SlidersHorizontal} description="A reading above its limit raises an alert" />
          <div className="space-y-4 p-5">
            {SENSOR_KEYS.map((k) => (
              <NumberField
                key={k}
                id={`limit-${k}`}
                label={SENSORS[k].label}
                unit={SENSORS[k].unit}
                value={limits[k]}
                step={k === 'vibration' ? 0.01 : 0.5}
                onChange={(v) => {
                  setLimits({ ...limits, [k]: v });
                  setDirty((d) => ({ ...d, limits: true }));
                }}
              />
            ))}
            <p className="text-xs text-white/55">Defaults come from the project: vibration 0.3 g, temperature 45 °C, motor current 3.0 A. Tune them against real baseline runs.</p>
            <div className="flex justify-end gap-2">
              {dirty.limits && (
                <Button size="sm" variant="ghost" onClick={() => { setLimits(Object.fromEntries(SENSOR_KEYS.map((k) => [k, String(loaded.settings.thresholds[k])]))); setDirty((d) => ({ ...d, limits: false })); }}>
                  Reset
                </Button>
              )}
              <Button size="sm" variant="primary" icon={Save} disabled={!dirty.limits} loading={busy === 'limits'} onClick={saveLimits}>
                Save limits
              </Button>
            </div>
          </div>
        </Panel>

        {/* Machine profile */}
        <Panel>
          <PanelHeader title="Machine profile" icon={Cpu} description="Shown in the header and exported reports" />
          <div className="space-y-4 p-5">
            <TextField id="m-name" label="Name" value={machine.name} onChange={(v) => { setMachine({ ...machine, name: v }); setDirty((d) => ({ ...d, machine: true })); }} />
            <TextField id="m-type" label="Type" value={machine.type} onChange={(v) => { setMachine({ ...machine, type: v }); setDirty((d) => ({ ...d, machine: true })); }} />
            <TextField id="m-loc" label="Location" value={machine.location} onChange={(v) => { setMachine({ ...machine, location: v }); setDirty((d) => ({ ...d, machine: true })); }} />
            <div className="flex justify-end">
              <Button size="sm" variant="primary" icon={Save} disabled={!dirty.machine} loading={busy === 'machine'} onClick={saveMachine}>
                Save profile
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      {/* Database */}
      <Panel>
        <PanelHeader title="Local database" icon={Database} description="SQLite file stored on this computer — nothing leaves your machine" />
        <div className="space-y-5 p-5">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Readings', fmtInt(status.db.readings)],
              ['Alerts', fmtInt(status.db.alerts)],
              ['Spray events', fmtInt(status.db.events)],
              ['File size', fmtBytes(status.db.sizeBytes)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
                <dt className="text-xs text-white/55">{k}</dt>
                <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-white">{v}</dd>
              </div>
            ))}
          </dl>
          <div>
            <p className="text-xs text-white/55">File location</p>
            <code className="mt-1 block break-all rounded-lg bg-white/[0.05] px-3 py-2 font-mono text-xs text-white/85">{status.db.path}</code>
            <p className="mt-2 text-xs text-white/50">Readings older than 7 days are pruned automatically. Alerts and spray events are kept. The file can be opened with any SQLite tool.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ['readings', '24h', 'Readings (24 h)'],
              ['alerts', 'all', 'All alerts'],
              ['lubrication', 'all', 'Spray log'],
            ].map(([kind, range, label]) => (
              <a
                key={kind}
                href={`/api/export?kind=${kind}&range=${range}`}
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 text-xs font-medium text-white transition-colors hover:bg-white/[0.1]"
              >
                <Download className="h-4 w-4" aria-hidden />
                {label} CSV
              </a>
            ))}
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-red-100">Danger zone</p>
                <p className="mt-0.5 text-xs text-white/60">Permanently delete the recorded readings, alerts and spray log. Settings are kept.</p>
              </div>
              {!confirmReset && (
                <Button variant="danger" size="sm" icon={Trash2} onClick={() => setConfirmReset(true)}>
                  Clear data…
                </Button>
              )}
            </div>
            {confirmReset && (
              <div className="mt-4 space-y-3 border-t border-red-500/15 pt-4">
                <p className="text-sm text-white/80">
                  This deletes {fmtInt(status.db.readings)} readings, {fmtInt(status.db.alerts)} alerts and {fmtInt(status.db.events)} spray events. It cannot be undone — export CSVs first if you need them.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    loading={busy === 'reset'}
                    onClick={() =>
                      run('reset', async () => {
                        await sendJson('POST', '/api/system', { action: 'reset_data', reseed: false });
                        setConfirmReset(false);
                      }, 'All recorded data cleared')
                    }
                  >
                    Delete everything
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                    Cancel
                  </Button>
                </div>
                {!hardware && (
                  <div className="flex flex-wrap items-center gap-3 border-t border-red-500/15 pt-3">
                    <Segmented
                      label="Simulated history to generate"
                      size="sm"
                      value={seedHours}
                      onChange={setSeedHours}
                      options={[
                        { value: '1', label: '1 h' },
                        { value: '6', label: '6 h' },
                        { value: '24', label: '24 h' },
                        { value: '48', label: '48 h' },
                      ]}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={busy === 'reseed'}
                      onClick={() =>
                        run('reseed', async () => {
                          await sendJson('POST', '/api/system', { action: 'reset_data', reseed: true, hours: Number(seedHours) });
                          setConfirmReset(false);
                        }, `Database reset with ${seedHours} h of simulated history`)
                      }
                    >
                      Delete and regenerate {seedHours} h of simulated history
                    </Button>
                    <p className="basis-full text-xs text-white/50">Simulated readings carry a fault label, so 24–48 h also works as training data for the ML Models page.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Panel>
    </Page>
  );
}
