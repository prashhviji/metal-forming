// Types shared by the API routes (server) and the UI (client). No runtime imports.

export type SensorKey = 'vibration' | 'temperature' | 'current';
export type DataSource = 'simulator' | 'hardware';
export type RangeKey = '5m' | '15m' | '1h' | '6h' | '24h';

export interface Thresholds {
  vibration: number;
  temperature: number;
  current: number;
}

export interface MqlConfig {
  /** Automatic temperature-triggered control on/off. Manual spray always works. */
  enabled: boolean;
  /** Start spraying when temperature reaches this value (°C). */
  activationTemp: number;
  /** Length of one spray cycle (s). */
  sprayDuration: number;
  /** Minimum pause between automatic cycles (s). */
  cooldown: number;
  /** Nozzle flow used to estimate lubricant consumption (ml/s). */
  flowRate: number;
}

export interface EngineConfig {
  source: DataSource;
  /** Simulator sample period (ms). */
  intervalMs: number;
  paused: boolean;
}

export interface AppSettings {
  thresholds: Thresholds;
  mql: MqlConfig;
  engine: EngineConfig;
}

export interface Reading {
  ts: number;
  vibration: number;
  temperature: number;
  current: number;
}

export interface SeriesResponse {
  range: RangeKey;
  bucketMs: number;
  points: Reading[];
  thresholds: Thresholds;
  source: DataSource;
}

export interface MachineInfo {
  id: string;
  name: string;
  type: string;
  location: string;
}

export type AlertType = SensorKey | 'lubrication';
export type AlertSeverity = 'Critical' | 'High' | 'Medium' | 'Info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface AlertRow {
  id: number;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  value: number | null;
  threshold: number | null;
  peak: number | null;
  status: AlertStatus;
  startedAt: number;
  resolvedAt: number | null;
  acknowledgedAt: number | null;
  samples: number;
}

export interface AlertsResponse {
  alerts: AlertRow[];
  total: number;
  counts: {
    active: number;
    acknowledged: number;
    resolved: number;
    byType: Record<AlertType, number>;
    bySeverity: Record<AlertSeverity, number>;
  };
}

export type MqlPhase = 'spraying' | 'armed' | 'cooldown' | 'disabled';

export interface MqlState {
  enabled: boolean;
  valve: 'on' | 'off';
  phase: MqlPhase;
  trigger: 'auto' | 'manual' | null;
  sprayEndsAt: number | null;
  cooldownEndsAt: number | null;
}

export interface LubricationEvent {
  id: number;
  startedAt: number;
  endedAt: number | null;
  trigger: 'auto' | 'manual';
  tempAtStart: number | null;
  durationS: number;
  volumeMl: number;
}

export interface LubricationResponse {
  config: MqlConfig;
  state: MqlState;
  latestTemp: number | null;
  totals: { activations: number; volumeMl: number; auto: number; manual: number };
  lastHour: { activations: number; volumeMl: number };
  /** Spray activity in 5 minute buckets for the last hour (oldest first). */
  activity: { ts: number; activations: number; volumeMl: number }[];
  events: LubricationEvent[];
}

export interface StatusResponse {
  now: number;
  machine: MachineInfo;
  source: DataSource;
  engine: { paused: boolean; intervalMs: number };
  latest: Reading | null;
  /** ms since the latest reading, null when there is none. */
  ageMs: number | null;
  /** 'live' = recent data, 'stale' = no data for a while, 'empty' = nothing recorded. */
  link: 'live' | 'stale' | 'empty' | 'paused';
  thresholds: Thresholds;
  mql: MqlState;
  mqlConfig: MqlConfig;
  alerts: { active: number; acknowledged: number; critical: number };
  db: { readings: number; alerts: number; events: number; sizeBytes: number; path: string };
}

export interface SensorStats {
  mean: number;
  std: number;
  min: number;
  max: number;
  p95: number;
  /** Share of samples above the limit, 0–100. */
  exceedancePct: number;
  /** Linear trend in sensor units per hour (null if not enough data). */
  slopePerHour: number | null;
}

export interface AnalyticsResponse {
  range: RangeKey;
  samples: number;
  from: number;
  to: number;
  thresholds: Thresholds;
  stats: Record<SensorKey, SensorStats>;
  /** Share of samples with every sensor inside its limit, 0–100. */
  compliancePct: number;
  correlation: Record<SensorKey, Record<SensorKey, number | null>>;
  alertsByBucket: { ts: number; vibration: number; temperature: number; current: number }[];
  alertTotals: Record<SensorKey, number>;
  mqlCycles: { total: number; auto: number };
  observations: { level: 'ok' | 'info' | 'warn'; text: string }[];
}
