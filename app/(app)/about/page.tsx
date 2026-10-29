'use client';

import {
  Activity,
  ArrowRight,
  BellRing,
  Cpu,
  Database,
  Droplets,
  Eye,
  Gauge,
  Radar,
  Thermometer,
  Zap,
} from 'lucide-react';
import { Page, PageHeader, Panel, PanelHeader, Pill } from '@/components/ui/kit';

const OBJECTIVES = [
  { icon: Radar, title: 'Monitor', text: 'Collect vibration, temperature and current readings.', color: 'text-sky-300 bg-sky-500/10 border-sky-500/25' },
  { icon: BellRing, title: 'Detect', text: 'Use defined thresholds to flag abnormal sensor values.', color: 'text-amber-300 bg-amber-500/10 border-amber-500/25' },
  { icon: Droplets, title: 'Control', text: 'Develop temperature-triggered MQL lubrication control.', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25' },
  { icon: Eye, title: 'Visualize', text: 'Display readings, trends and alerts on a web dashboard.', color: 'text-violet-300 bg-violet-500/10 border-violet-500/25' },
];

const FLOW = ['CNC machine', 'Sensors', 'Data acquisition', 'Threshold analysis', 'Alerts + dashboard / MQL control'];

const SENSORS = [
  {
    icon: Activity,
    color: '#60a5fa',
    name: 'Vibration',
    limit: '0.3 g',
    why: 'Can indicate mechanical abnormalities or tool wear.',
  },
  {
    icon: Thermometer,
    color: '#fb923c',
    name: 'Temperature',
    limit: '45 °C',
    why: 'A rise can signal excess friction or inadequate cooling. Also the trigger for MQL.',
  },
  {
    icon: Zap,
    color: '#a78bfa',
    name: 'Motor current',
    limit: '3.0 A',
    why: 'Changes can indicate varying load conditions.',
  },
];

const STATUS: { label: string; state: 'done' | 'partial' | 'todo'; note: string }[] = [
  { label: 'Vibration, temperature and current sensors', state: 'done', note: 'Working; only short test runs available.' },
  { label: 'Fixed-threshold alert logic', state: 'done', note: 'Implemented in this dashboard and stored in the local database.' },
  { label: 'Web dashboard, alert history, analytics', state: 'done', note: 'Runs on simulated data until the sensor node posts to /api/readings.' },
  { label: 'Temperature-triggered MQL control logic', state: 'partial', note: 'Control rule implemented in software; physical MQL hardware is partially assembled / under validation.' },
  {
    label: 'ML fault-detection models',
    state: 'partial',
    note: 'Eleven models trained and compared on simulated data (see ML Models). Not validated on the real machine; live alerts are still fixed thresholds.',
  },
  { label: 'Failure prediction (ahead of time)', state: 'todo', note: 'Needs real run-to-failure data; simulated data has no precursor signal to learn from.' },
];

const TESTS = [
  'Collect repeatable readings under safe operating conditions.',
  'Measure false alarms and alert response time.',
  'Test MQL activation / deactivation over repeated cycles.',
  'Record actual lubricant use and temperature trends before making performance claims.',
];

const STATE_PILL = {
  done: <Pill tone="ok">Working</Pill>,
  partial: <Pill tone="warn">In progress</Pill>,
  todo: <Pill tone="neutral">Not started</Pill>,
} as const;

export default function AboutPage() {
  return (
    <Page className="max-w-[1100px]">
      <PageHeader
        icon={Cpu}
        tone="ok"
        title="AI-based predictive maintenance and lubrication system for CNC machines"
        description="Computer Integrated Manufacturing (CIM) project · Department of Mechanical Engineering, VIT Chennai"
      />

      <Panel>
        <PanelHeader title="Project team" />
        <div className="flex flex-wrap gap-2 p-5">
          {['Sai Aditya', 'Prasanth V', 'Priyanshu Raulkumar Bhimte'].map((n) => (
            <span key={n} className="rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-sm text-white/90">
              {n}
            </span>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Problem" description="Why monitor the machine at all" />
        <div className="space-y-3 p-5 text-sm leading-relaxed text-white/75">
          <p>Unexpected machine conditions can interrupt production and affect machining quality, and manual checks may not identify developing issues early.</p>
          <ul className="grid gap-2 sm:grid-cols-3">
            {SENSORS.map((s) => (
              <li key={s.name} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5">
                <p className="flex items-center gap-2 text-sm font-medium text-white">
                  <s.icon className="h-4 w-4" style={{ color: s.color }} aria-hidden />
                  {s.name}
                </p>
                <p className="mt-1.5 text-xs text-white/60">{s.why}</p>
                <p className="mt-2 font-mono text-xs text-white/50">
                  Alert limit: <span className="text-white/85">{s.limit}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {OBJECTIVES.map((o) => (
          <div key={o.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl border ${o.color}`}>
              <o.icon className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="text-sm font-semibold text-white">{o.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-white/60">{o.text}</p>
          </div>
        ))}
      </div>

      <Panel>
        <PanelHeader title="System architecture" description="The intended workflow, and where each part lives in this app" />
        <div className="space-y-5 p-5">
          <ol className="flex flex-wrap items-center gap-2">
            {FLOW.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/90">{step}</span>
                {i < FLOW.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-white/35" aria-hidden />}
              </li>
            ))}
          </ol>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Gauge, title: 'Ingestion', text: 'POST /api/readings from the microcontroller, or the built-in simulator. Each reading is checked against the alert limits and the MQL rule as it arrives.' },
              { icon: Database, title: 'Local database', text: 'SQLite file in the data/ folder holds readings, alerts, spray events and settings. No cloud service is involved.' },
              { icon: Droplets, title: 'Actuation', text: 'The reply to every reading includes the MQL valve command (on / off) for the node to apply to the lubricant/air valve.' },
            ].map((b) => (
              <div key={b.title} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-white">
                  <b.icon className="h-4 w-4 text-white/50" aria-hidden />
                  {b.title}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-white/60">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="MQL lubrication" description="Minimum quantity lubrication" icon={Droplets} />
        <div className="space-y-3 p-5 text-sm leading-relaxed text-white/75">
          <p>
            Lubricant and compressed air form a fine spray that is delivered to the cutting zone. In this project the intended control rule is temperature-based: when the measured
            temperature reaches the activation value, the valve opens for a set spray time, then waits through a cooldown before it may fire again.
          </p>
          <p className="text-white/60">Activation temperature, spray time, cooldown and nozzle flow are all adjustable on the Lubrication page.</p>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Implementation status" description="What is working today, stated as it is" />
        <ul className="divide-y divide-white/[0.05]">
          {STATUS.map((s) => (
            <li key={s.label} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{s.label}</p>
                <p className="mt-0.5 text-xs text-white/60">{s.note}</p>
              </div>
              {STATE_PILL[s.state]}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader title="Validation plan" description="Tests needed before any performance claim is made" />
        <ol className="list-decimal space-y-2 p-5 pl-9 text-sm leading-relaxed text-white/75 marker:text-white/40">
          {TESTS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
        <p className="border-t border-white/[0.06] px-5 py-3.5 text-xs leading-relaxed text-white/60">
          No AI accuracy, downtime reduction or tool-life improvement is claimed without supporting experiments. Values shown while the data source is &ldquo;Simulated&rdquo;
          are generated by software and are not experimental results.
        </p>
      </Panel>
    </Page>
  );
}
