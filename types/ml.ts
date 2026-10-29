// Shape of ml/results/metrics.json (written by ml/train.py) as served by /api/ml.

export type MlFamily = 'baseline' | 'supervised' | 'unsupervised';

export interface MlMetrics {
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  pr_auc: number;
  false_alarm_events: number;
  false_alarms_per_hour: number;
  episodes: number;
  episodes_detected: number;
  episode_recall: number;
  /** Seconds from the start of a labelled fault to the first alarm (null if none was caught). */
  delay_median_s: number | null;
  delay_p90_s: number | null;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

export interface MlModel {
  slug: string;
  name: string;
  family: MlFamily;
  blurb: string;
  /** How the alarm level was chosen. */
  threshold: string;
  fit_seconds: number;
  n_fit_samples: number;
  predict_ms_per_1k: number;
  /** Validation-period metrics (used for tuning and for picking the "best" model). */
  val: MlMetrics;
  /** Held-out test-period metrics. */
  metrics: MlMetrics;
}

export interface MlSplit {
  samples: number;
  hours: number;
  fault_samples: number;
  episodes: number;
}

export interface MlResults {
  generated_at: string;
  disclaimer: string;
  versions: Record<string, string>;
  seed: number;
  fast_mode: boolean;
  dataset: {
    source: string;
    samples: number;
    hours: number;
    sample_rate_hz: number;
    fault_samples: number;
    fault_rate: number;
    episodes: number;
    n_features: number;
    features: string[];
    recovery_tail_s: number;
    label_definition: string;
  };
  splits: { train: MlSplit; val: MlSplit; test: MlSplit };
  protocol: {
    windows_s: number[];
    recovery_tail_s: number;
    event_merge_s: number;
    limits: Record<string, number>;
    unsupervised_alarm_quantile: number;
  };
  best: { supervised: string; supervised_name: string; unsupervised: string; unsupervised_name: string };
  controls: { label_shuffle_roc_auc: number };
  notes: string[];
  models: MlModel[];
  feature_importance: { feature: string; importance: number }[];
}

export type MlResponse =
  | { available: false }
  | { available: true; modifiedAt: number; figures: string[]; results: MlResults };
