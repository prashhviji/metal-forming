'use client';

import { BrainCircuit, Database, FlaskConical, Info, Layers, ShieldAlert, Terminal, TriangleAlert } from 'lucide-react';
import { EmptyState, Page, PageHeader, PageLoader, Panel, PanelHeader, Pill, StatTile, TONE, type Tone } from '@/components/ui/kit';
import { usePoll } from '@/lib/client/use-poll';
import { fmtInt } from '@/lib/format';
import type { MlFamily, MlModel, MlResponse, MlResults } from '@/types/ml';

const FAMILY: Record<MlFamily, { label: string; tone: Tone; color: string }> = {
  baseline: { label: 'Current rule', tone: 'neutral', color: TONE.neutral.solid },
  supervised: { label: 'Supervised', tone: 'info', color: TONE.info.solid },
  unsupervised: { label: 'Unsupervised', tone: 'accent', color: TONE.accent.solid },
};

const FIGURES: { name: string; title: string; caption: string; alt: string; wide?: boolean }[] = [
  {
    name: 'model_comparison',
    title: 'Model comparison',
    caption: 'F1, false alarms per hour and recall for every model on the held-out test period.',
    alt: 'Bar charts comparing F1 score, false alarms per hour and recall of each model against the fixed-threshold rule',
    wide: true,
  },
  {
    name: 'roc_pr',
    title: 'ROC and precision–recall',
    caption: 'Best supervised model, best unsupervised model and the threshold rule (axes zoomed to the top of the plot).',
    alt: 'ROC and precision-recall curves for the best supervised model, the best unsupervised model and the fixed-threshold rule',
  },
  {
    name: 'feature_importance',
    title: 'What the Random Forest looks at',
    caption: 'Vibration and its short-term peaks dominate; current and temperature spread add the rest.',
    alt: 'Horizontal bar chart of the twelve most important features of the random forest',
  },
  {
    name: 'detection_timeline',
    title: 'One fault in the test period',
    caption: 'Sensor traces from the test period, the labelled fault, and when the threshold rule and the best supervised model raised an alarm.',
    alt: 'Timeline of vibration, temperature and current around a labelled fault with alarm markers for the threshold rule and the best supervised model',
    wide: true,
  },
];

const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;

function span(values: number[], fmt: (v: number) => string) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return fmt(lo) === fmt(hi) ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`;
}

function orderModels(models: MlModel[]) {
  const rank: Record<MlFamily, number> = { baseline: 0, supervised: 1, unsupervised: 2 };
  return [...models].sort((a, b) => rank[a.family] - rank[b.family] || b.metrics.f1 - a.metrics.f1);
}

function takeaways(models: MlModel[]): string[] {
  const base = models.find((m) => m.family === 'baseline');
  const sup = models.filter((m) => m.family === 'supervised');
  const uns = models.filter((m) => m.family === 'unsupervised');
  if (!base || !sup.length || !uns.length) return [];

  const out: string[] = [];
  const all = [base, ...sup, ...uns];
  const total = base.metrics.episodes;
  if (all.every((m) => m.metrics.episodes_detected === total)) {
    out.push(
      `Every approach flagged all ${total} fault episodes in the test period — on this simulated data the existing threshold rule already notices every fault, because simulated faults are built to cross a limit.`
    );
  } else {
    out.push(
      `Fault episodes caught: threshold rule ${base.metrics.episodes_detected}/${total}, supervised ${span(sup.map((m) => m.metrics.episodes_detected), String)}/${total}, unsupervised ${span(uns.map((m) => m.metrics.episodes_detected), String)}/${total}.`
    );
  }
  out.push(
    `The learned models cover more of each fault: supervised models flag ${span(sup.map((m) => m.metrics.recall * 100), (v) => `${v.toFixed(1)}%`)} of fault samples against ${pct(base.metrics.recall)} for the threshold rule, and they alarm sooner (median delay ${span(sup.map((m) => m.metrics.delay_median_s ?? 0), (v) => `${v.toFixed(0)} s`)} against ${(base.metrics.delay_median_s ?? 0).toFixed(0)} s).`
  );
  out.push(
    `The price is false alarms: ${span(sup.map((m) => m.metrics.false_alarms_per_hour), (v) => v.toFixed(1))} per hour for supervised models and ${span(uns.map((m) => m.metrics.false_alarms_per_hour), (v) => v.toFixed(1))} per hour for unsupervised ones, against ${base.metrics.false_alarms_per_hour.toFixed(1)} for the threshold rule.`
  );
  out.push(
    'Unsupervised models learn only what normal looks like and need no fault labels — the realistic route when real fault examples are scarce — but they raise more false alarms than supervised ones.'
  );
  return out;
}

function ModelTable({ results }: { results: MlResults }) {
  const rows = orderModels(results.models);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-left text-xs text-white/55">
            <th className="px-5 py-2.5 font-medium">Model</th>
            <th className="px-3 py-2.5 font-medium">Type</th>
            <th className="px-3 py-2.5 text-right font-medium">Precision</th>
            <th className="px-3 py-2.5 text-right font-medium">Recall</th>
            <th className="px-3 py-2.5 text-right font-medium">F1</th>
            <th className="px-3 py-2.5 text-right font-medium">ROC-AUC</th>
            <th className="px-3 py-2.5 text-right font-medium">Episodes caught</th>
            <th className="px-3 py-2.5 text-right font-medium">Median delay</th>
            <th className="px-5 py-2.5 text-right font-medium">False alarms / h</th>
          </tr>
        </thead>
        <tbody className="font-mono text-[13px] tabular-nums">
          {rows.map((r) => {
            const fam = FAMILY[r.family];
            const m = r.metrics;
            const isBest = r.slug === results.best.supervised || r.slug === results.best.unsupervised;
            return (
              <tr key={r.slug} className="border-b border-white/[0.04] last:border-0">
                <td className="px-5 py-3 font-sans">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{r.name}</span>
                    {isBest && (
                      <span title="Picked on the validation period, never on the test period">
                        <Pill tone="ok">Best of type</Pill>
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 max-w-[340px] text-xs text-white/50">{r.blurb}</p>
                </td>
                <td className="px-3 py-3 font-sans">
                  <Pill tone={fam.tone}>{fam.label}</Pill>
                </td>
                <td className="px-3 py-3 text-right text-white/80">{pct(m.precision)}</td>
                <td className="px-3 py-3 text-right text-white/80">{pct(m.recall)}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <span className="w-12 text-right font-semibold text-white">{m.f1.toFixed(3)}</span>
                    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden>
                      <span className="block h-full rounded-full" style={{ width: `${m.f1 * 100}%`, backgroundColor: fam.color }} />
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-white/80">{m.roc_auc.toFixed(3)}</td>
                <td className="px-3 py-3 text-right text-white/80">
                  {m.episodes_detected}/{m.episodes}
                </td>
                <td className="px-3 py-3 text-right text-white/80">{m.delay_median_s === null ? '—' : `${m.delay_median_s.toFixed(0)} s`}</td>
                <td className={`px-5 py-3 text-right ${m.false_alarms_per_hour >= 5 ? 'font-semibold text-amber-300' : 'text-white/80'}`}>
                  {m.false_alarms_per_hour.toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SplitTable({ results }: { results: MlResults }) {
  const rows = [
    { key: 'train', label: 'Train', note: 'earliest data — models are fitted here', s: results.splits.train },
    { key: 'val', label: 'Validation', note: 'alarm levels tuned, best model picked', s: results.splits.val },
    { key: 'test', label: 'Test', note: 'latest data — only used for the results above', s: results.splits.test },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-left text-xs text-white/55">
            <th className="px-5 py-2.5 font-medium">Split</th>
            <th className="px-3 py-2.5 text-right font-medium">Hours</th>
            <th className="px-3 py-2.5 text-right font-medium">Samples</th>
            <th className="px-3 py-2.5 text-right font-medium">Fault samples</th>
            <th className="px-5 py-2.5 text-right font-medium">Fault episodes</th>
          </tr>
        </thead>
        <tbody className="font-mono text-[13px] tabular-nums">
          {rows.map(({ key, label, note, s }) => (
            <tr key={key} className="border-b border-white/[0.04] last:border-0">
              <td className="px-5 py-3 font-sans">
                <span className="font-medium text-white">{label}</span>
                <span className="ml-2 text-xs text-white/50">{note}</span>
              </td>
              <td className="px-3 py-3 text-right text-white/80">{s.hours.toFixed(1)}</td>
              <td className="px-3 py-3 text-right text-white/80">{fmtInt(s.samples)}</td>
              <td className="px-3 py-3 text-right text-white/80">{fmtInt(s.fault_samples)}</td>
              <td className="px-5 py-3 text-right text-white/80">{s.episodes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const COMMANDS = `# one-time setup (tested with Python 3.12)
python3 -m venv ml/.venv && ml/.venv/bin/pip install -r ml/requirements.txt

# 1. start a separate simulator that writes labelled data to ml/data (your dashboard data is untouched)
npm run ml:data

# 2. in another terminal: generate 48 h of labelled history, then stop that server
curl -X POST localhost:3200/api/system -H 'Content-Type: application/json' \\
  -d '{"action":"reset_data","reseed":true,"hours":48}'

# 3. train and compare every model (about 15 s)
npm run ml:train`;

export default function ModelsPage() {
  const { data, loading } = usePoll<MlResponse>('/api/ml', 30000);

  if (!data && loading) return <PageLoader label="Loading model results…" />;
  if (!data) return <PageLoader label="Waiting for the server…" />;

  if (!data.available) {
    return (
      <Page className="max-w-[1100px]">
        <PageHeader icon={BrainCircuit} tone="accent" title="ML models" description="Fault-detection models trained on the simulator's labelled data" />
        <Panel>
          <EmptyState
            icon={FlaskConical}
            title="No trained models yet"
            description="Generate labelled simulator data and run the training script. The commands are below; results appear here afterwards."
          />
          <pre className="mx-5 mb-5 overflow-x-auto rounded-xl border border-white/[0.08] bg-black/30 p-4 font-mono text-xs leading-relaxed text-white/80">{COMMANDS}</pre>
        </Panel>
      </Page>
    );
  }

  const { results, figures } = data;
  const bestSup = results.models.find((m) => m.slug === results.best.supervised);
  const base = results.models.find((m) => m.family === 'baseline');
  const trained = results.models.filter((m) => m.family !== 'baseline').length;
  const points = takeaways(results.models);

  return (
    <Page>
      <PageHeader
        icon={BrainCircuit}
        tone="accent"
        title="ML models"
        description={`Fault-detection models compared with the fixed-threshold rule · last trained ${results.generated_at}`}
        actions={
          <Pill tone="warn" dot>
            Trained on simulated data
          </Pill>
        }
      />

      <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3.5" role="note">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
        <p className="text-sm leading-relaxed text-amber-100/90">
          <strong className="font-semibold text-amber-100">Read this first.</strong> {results.disclaimer} The live alerts on the other pages still use fixed thresholds; none of
          these models is running on the machine.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Database}
          label="Labelled data"
          value={fmtInt(results.dataset.samples)}
          sub={`${results.dataset.hours.toFixed(0)} h at ${results.dataset.sample_rate_hz} Hz · ${results.dataset.episodes} fault episodes`}
        />
        <StatTile icon={Layers} label="Models trained" value={trained} tone="accent" sub={`${results.dataset.n_features} features each · compared with 1 threshold rule`} />
        <StatTile
          icon={BrainCircuit}
          label="Best supervised (test F1)"
          value={bestSup ? bestSup.metrics.f1.toFixed(3) : '—'}
          tone="info"
          sub={bestSup ? `${bestSup.name} · recall ${pct(bestSup.metrics.recall)}` : undefined}
        />
        <StatTile
          icon={TriangleAlert}
          label="Threshold rule (test F1)"
          value={base ? base.metrics.f1.toFixed(3) : '—'}
          sub={base ? `recall ${pct(base.metrics.recall)} · ${base.metrics.false_alarms_per_hour.toFixed(1)} false alarms/h` : undefined}
        />
      </div>

      <Panel>
        <PanelHeader
          title="Results on the held-out test period"
          description={`${fmtInt(results.splits.test.samples)} samples · ${results.splits.test.hours.toFixed(1)} h · ${results.splits.test.episodes} fault episodes, none used for fitting`}
        />
        <ModelTable results={results} />
        <p className="border-t border-white/[0.06] px-5 py-3.5 text-xs leading-relaxed text-white/55">
          Precision, recall and F1 are per sample. <em className="not-italic text-white/75">Episodes caught</em> counts fault episodes flagged at least once while active;{' '}
          <em className="not-italic text-white/75">median delay</em> is seconds from the start of the labelled fault to the first alarm;{' '}
          <em className="not-italic text-white/75">false alarms / h</em> counts alarm bursts during fault-free operation.
        </p>
      </Panel>

      {points.length > 0 && (
        <Panel>
          <PanelHeader title="What the comparison shows" description="Generated from the table above" icon={Info} />
          <ul className="divide-y divide-white/[0.05]">
            {points.map((p) => (
              <li key={p} className="px-5 py-3.5 text-sm leading-relaxed text-white/80">
                {p}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {figures.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {FIGURES.filter((f) => figures.includes(f.name)).map((f) => (
            <Panel key={f.name} className={f.wide ? 'lg:col-span-2' : undefined}>
              <PanelHeader title={f.title} description={f.caption} />
              <div className="p-4">
                <a href={`/api/ml/plot/${f.name}`} target="_blank" rel="noreferrer" className="block rounded-xl bg-[#fcfcfb] p-2" title="Open full size">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/ml/plot/${f.name}?v=${Math.round(data.modifiedAt)}`} alt={f.alt} loading="lazy" className="h-auto w-full" />
                </a>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Panel>
        <PanelHeader title="Data and protocol" description="How the models were trained and scored" icon={FlaskConical} />
        <SplitTable results={results} />
        <ul className="space-y-2 border-t border-white/[0.06] px-5 py-4 text-sm leading-relaxed text-white/75">
          <li>
            <strong className="font-medium text-white/90">Labels.</strong> {results.dataset.label_definition} The {results.dataset.recovery_tail_s} s after each fault is ignored,
            because temperature is still cooling and the label is ambiguous.
          </li>
          <li>
            <strong className="font-medium text-white/90">Features.</strong> {results.dataset.n_features} per sample, computed only from the current and earlier readings: raw value,
            mean and spread over {results.protocol.windows_s.join(', ')} s, 15 s peak, 15 s low, short-term slope and deviation from the 60 s average, for each sensor.
          </li>
          <li>
            <strong className="font-medium text-white/90">Split.</strong> Chronological, cut at quiet moments with no fault nearby, so the test period is strictly later than anything the
            models saw.
          </li>
          <li>
            <strong className="font-medium text-white/90">Alarm levels.</strong> Supervised models: the level that maximises F1 on the validation period. Unsupervised models: the{' '}
            {(results.protocol.unsupervised_alarm_quantile * 100).toFixed(1)}th percentile of normal validation scores, so no fault labels are needed.
          </li>
          <li>
            <strong className="font-medium text-white/90">Negative control.</strong> The same logistic regression trained on shuffled labels reaches ROC-AUC{' '}
            {results.controls.label_shuffle_roc_auc.toFixed(2)} on the test period (chance is 0.50), so the real models&apos; scores are not an artefact of the pipeline.
          </li>
        </ul>
      </Panel>

      <Panel tone="warn">
        <PanelHeader title="How to read this honestly" description="What these results do and do not show" icon={TriangleAlert} />
        <ul className="list-disc space-y-2 p-5 pl-9 text-sm leading-relaxed text-white/75 marker:text-white/40">
          {results.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader title="Re-run the training" description="Everything is reproducible from the repository" icon={Terminal} />
        <div className="p-5">
          <pre className="overflow-x-auto rounded-xl border border-white/[0.08] bg-black/30 p-4 font-mono text-xs leading-relaxed text-white/80">{COMMANDS}</pre>
          <p className="mt-3 text-xs leading-relaxed text-white/55">
            Outputs: <code className="font-mono text-white/75">ml/results/report.md</code>, <code className="font-mono text-white/75">metrics.json</code>, the four figures above, and
            the fitted models in <code className="font-mono text-white/75">ml/models/*.joblib</code> (git-ignored). scikit-learn {results.versions['scikit-learn']}, seed {results.seed}.
          </p>
        </div>
      </Panel>
    </Page>
  );
}
