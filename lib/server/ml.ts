import fs from 'node:fs';
import path from 'node:path';
import type { MlModel, MlResponse, MlResults } from '@/types/ml';

// Results written by `ml/train.py`. The app only ever reads them; training happens offline in Python.
export const ML_FIGURES = ['model_comparison', 'roc_pr', 'detection_timeline', 'feature_importance'] as const;

function resultsDir() {
  return path.join(process.cwd(), 'ml', 'results');
}

export function readMlResults(): MlResponse {
  const file = path.join(resultsDir(), 'metrics.json');
  if (!fs.existsSync(file)) return { available: false };

  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Omit<MlResults, 'models'> & { models: (MlModel & { roc?: unknown })[] };
  // ROC point lists are only used for the plots; keep the API response small.
  const models = raw.models.map(({ roc: _roc, ...m }) => m);

  return {
    available: true,
    modifiedAt: fs.statSync(file).mtimeMs,
    figures: ML_FIGURES.filter((f) => fs.existsSync(path.join(resultsDir(), `${f}.png`))),
    results: { ...raw, models },
  };
}

/** PNG bytes for a whitelisted figure name, or null. */
export function readMlFigure(name: string): Buffer | null {
  if (!(ML_FIGURES as readonly string[]).includes(name)) return null;
  const file = path.join(resultsDir(), `${name}.png`);
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}
