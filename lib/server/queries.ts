import { getDb, MACHINE_ID } from './db';
import { getSettings } from './settings';
import { getMqlState, latestReading } from './engine';
import { SENSOR_KEYS, SENSORS } from '@/lib/sensors';
import type {
  AlertRow,
  AlertSeverity,
  AlertsResponse,
  AlertStatus,
  AlertType,
  AnalyticsResponse,
  LubricationEvent,
  LubricationResponse,
  RangeKey,
  Reading,
  SensorKey,
  SensorStats,
  SeriesResponse,
} from '@/types/monitor';

export const RANGE_MS: Record<RangeKey, number> = {
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '6h': 6 * 3600_000,
  '24h': 24 * 3600_000,
};

export function parseRange(v: string | null, fallback: RangeKey): RangeKey {
  return v && v in RANGE_MS ? (v as RangeKey) : fallback;
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/* ------------------------------------------------------------------ */
/* Time series                                                         */
/* ------------------------------------------------------------------ */

/** Peak-per-bucket series (so short spikes stay visible on wide ranges). */
export function getSeries(range: RangeKey): SeriesResponse {
  const db = getDb();
  const settings = getSettings();
  const spanMs = RANGE_MS[range];
  const bucketMs = Math.max(1000, Math.ceil(spanMs / 300 / 1000) * 1000);
  const since = Date.now() - spanMs;

  const rows = db
    .prepare(
      `SELECT CAST(ts / ? AS INTEGER) * ? AS ts,
              MAX(vibration) AS vibration, MAX(temperature) AS temperature, MAX(current) AS current
       FROM readings WHERE machine_id = ? AND ts >= ?
       GROUP BY CAST(ts / ? AS INTEGER) ORDER BY ts`
    )
    .all(bucketMs, bucketMs, MACHINE_ID, since, bucketMs) as Reading[];

  return { range, bucketMs, points: rows, thresholds: settings.thresholds, source: settings.engine.source };
}

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */

interface AlertDbRow {
  id: number;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  value: number | null;
  threshold: number | null;
  peak: number | null;
  status: AlertStatus;
  started_at: number;
  resolved_at: number | null;
  acknowledged_at: number | null;
  samples: number;
}

const toAlert = (r: AlertDbRow): AlertRow => ({
  id: r.id,
  type: r.type,
  severity: r.severity,
  message: r.message,
  value: r.value,
  threshold: r.threshold,
  peak: r.peak,
  status: r.status,
  startedAt: r.started_at,
  resolvedAt: r.resolved_at,
  acknowledgedAt: r.acknowledged_at,
  samples: r.samples,
});

export interface AlertQuery {
  status?: AlertStatus | 'open';
  type?: AlertType;
  limit?: number;
  offset?: number;
}

export function getAlerts(q: AlertQuery = {}): AlertsResponse {
  const db = getDb();
  const where: string[] = ['machine_id = ?'];
  const args: (string | number)[] = [MACHINE_ID];

  if (q.status === 'open') where.push(`status != 'resolved'`);
  else if (q.status) {
    where.push('status = ?');
    args.push(q.status);
  }
  if (q.type) {
    where.push('type = ?');
    args.push(q.type);
  }

  const limit = Math.min(Math.max(q.limit ?? 100, 1), 500);
  const offset = Math.max(q.offset ?? 0, 0);

  const rows = db
    .prepare(`SELECT * FROM alerts WHERE ${where.join(' AND ')} ORDER BY started_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...args, limit, offset) as AlertDbRow[];
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM alerts WHERE ${where.join(' AND ')}`).get(...args) as { n: number }).n;

  const group = (col: string) =>
    db.prepare(`SELECT ${col} AS k, COUNT(*) AS n FROM alerts WHERE machine_id = ? GROUP BY ${col}`).all(MACHINE_ID) as {
      k: string;
      n: number;
    }[];

  // Status counts describe threshold alerts only; lubrication entries are events, not faults.
  const status = Object.fromEntries(
    (
      db
        .prepare(`SELECT status AS k, COUNT(*) AS n FROM alerts WHERE machine_id = ? AND type != 'lubrication' GROUP BY status`)
        .all(MACHINE_ID) as { k: string; n: number }[]
    ).map((r) => [r.k, r.n])
  );
  const byType = { vibration: 0, temperature: 0, current: 0, lubrication: 0 } as Record<AlertType, number>;
  const bySeverity = { Critical: 0, High: 0, Medium: 0, Info: 0 } as Record<AlertSeverity, number>;
  for (const r of group('type')) byType[r.k as AlertType] = r.n;
  for (const r of group('severity')) bySeverity[r.k as AlertSeverity] = r.n;

  return {
    alerts: rows.map(toAlert),
    total,
    counts: {
      active: status.active ?? 0,
      acknowledged: status.acknowledged ?? 0,
      resolved: status.resolved ?? 0,
      byType,
      bySeverity,
    },
  };
}

export function acknowledgeAlert(id: number): boolean {
  const res = getDb()
    .prepare(`UPDATE alerts SET status = 'acknowledged', acknowledged_at = ? WHERE id = ? AND machine_id = ? AND status = 'active'`)
    .run(Date.now(), id, MACHINE_ID);
  return res.changes > 0;
}

export function acknowledgeAllAlerts(): number {
  const res = getDb()
    .prepare(
      `UPDATE alerts SET status = 'acknowledged', acknowledged_at = ? WHERE machine_id = ? AND status = 'active' AND type != 'lubrication'`
    )
    .run(Date.now(), MACHINE_ID);
  return res.changes;
}

/* ------------------------------------------------------------------ */
/* Lubrication                                                         */
/* ------------------------------------------------------------------ */

export function getLubrication(): LubricationResponse {
  const db = getDb();
  const now = Date.now();
  const cfg = getSettings().mql;

  const totals = db
    .prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(volume_ml), 0) AS ml,
              COALESCE(SUM(trigger = 'auto'), 0) AS auto, COALESCE(SUM(trigger = 'manual'), 0) AS manual
       FROM lubrication_events WHERE machine_id = ?`
    )
    .get(MACHINE_ID) as { n: number; ml: number; auto: number; manual: number };

  const BUCKET = 5 * 60_000;
  const currentBucket = Math.floor(now / BUCKET) * BUCKET;
  const first = currentBucket - 11 * BUCKET;
  const grouped = db
    .prepare(
      `SELECT CAST(started_at / ? AS INTEGER) * ? AS b, COUNT(*) AS n, COALESCE(SUM(volume_ml), 0) AS ml
       FROM lubrication_events WHERE machine_id = ? AND started_at >= ? GROUP BY b`
    )
    .all(BUCKET, BUCKET, MACHINE_ID, first) as { b: number; n: number; ml: number }[];
  const byBucket = new Map(grouped.map((r) => [r.b, r]));
  const activity = Array.from({ length: 12 }, (_, i) => {
    const ts = first + i * BUCKET;
    const r = byBucket.get(ts);
    return { ts, activations: r?.n ?? 0, volumeMl: round(r?.ml ?? 0, 2) };
  });
  const lastHour = {
    activations: activity.reduce((s, a) => s + a.activations, 0),
    volumeMl: round(activity.reduce((s, a) => s + a.volumeMl, 0), 2),
  };

  const events = (
    db
      .prepare(
        `SELECT id, started_at, ended_at, trigger, temp_at_start, duration_s, volume_ml
         FROM lubrication_events WHERE machine_id = ? ORDER BY started_at DESC, id DESC LIMIT 30`
      )
      .all(MACHINE_ID) as {
      id: number;
      started_at: number;
      ended_at: number | null;
      trigger: 'auto' | 'manual';
      temp_at_start: number | null;
      duration_s: number;
      volume_ml: number;
    }[]
  ).map(
    (r): LubricationEvent => ({
      id: r.id,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      trigger: r.trigger,
      tempAtStart: r.temp_at_start,
      durationS: r.duration_s,
      volumeMl: r.volume_ml,
    })
  );

  return {
    config: cfg,
    state: getMqlState(now),
    latestTemp: latestReading(db)?.temperature ?? null,
    totals: { activations: totals.n, volumeMl: round(totals.ml, 2), auto: totals.auto, manual: totals.manual },
    lastHour,
    activity,
    events,
  };
}

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 5) return null;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let da = 0;
  let dbb = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    dbb += (b[i] - mb) ** 2;
  }
  if (da === 0 || dbb === 0) return null;
  return num / Math.sqrt(da * dbb);
}

/** Least-squares slope of y against x (x in hours). */
function slope(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 5) return null;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

export function getAnalytics(range: RangeKey): AnalyticsResponse {
  const db = getDb();
  const { thresholds } = getSettings();
  const spanMs = RANGE_MS[range];
  const to = Date.now();
  const from = to - spanMs;

  const agg = db
    .prepare(
      `SELECT COUNT(*) AS n,
         AVG(vibration) AS v_mean, AVG(vibration * vibration) AS v_sq, MIN(vibration) AS v_min, MAX(vibration) AS v_max,
         SUM(vibration > ?) AS v_over,
         AVG(temperature) AS t_mean, AVG(temperature * temperature) AS t_sq, MIN(temperature) AS t_min, MAX(temperature) AS t_max,
         SUM(temperature > ?) AS t_over,
         AVG(current) AS c_mean, AVG(current * current) AS c_sq, MIN(current) AS c_min, MAX(current) AS c_max,
         SUM(current > ?) AS c_over,
         SUM(vibration <= ? AND temperature <= ? AND current <= ?) AS ok
       FROM readings WHERE machine_id = ? AND ts >= ?`
    )
    .get(
      thresholds.vibration,
      thresholds.temperature,
      thresholds.current,
      thresholds.vibration,
      thresholds.temperature,
      thresholds.current,
      MACHINE_ID,
      from
    ) as Record<string, number | null>;

  const n = (agg.n as number) ?? 0;

  // Bucketed means feed the trend + correlation (cheap and robust to uneven sampling).
  const bucketMs = Math.max(1000, Math.ceil(spanMs / 120 / 1000) * 1000);
  const buckets = db
    .prepare(
      `SELECT CAST(ts / ? AS INTEGER) * ? AS ts, AVG(vibration) AS vibration, AVG(temperature) AS temperature, AVG(current) AS current
       FROM readings WHERE machine_id = ? AND ts >= ? GROUP BY CAST(ts / ? AS INTEGER) ORDER BY ts`
    )
    .all(bucketMs, bucketMs, MACHINE_ID, from, bucketMs) as Reading[];
  const hours = buckets.map((b) => b.ts / 3_600_000);

  const p95 = (col: SensorKey): number => {
    if (n === 0) return 0;
    const off = Math.min(n - 1, Math.floor(n * 0.95));
    const row = db
      .prepare(`SELECT ${col} AS x FROM readings WHERE machine_id = ? AND ts >= ? ORDER BY ${col} LIMIT 1 OFFSET ?`)
      .get(MACHINE_ID, from, off) as { x: number } | undefined;
    return row?.x ?? 0;
  };

  const short = { vibration: 'v', temperature: 't', current: 'c' } as const;
  const stats = {} as Record<SensorKey, SensorStats>;
  for (const key of SENSOR_KEYS) {
    const p = short[key];
    const mean = (agg[`${p}_mean`] as number) ?? 0;
    const variance = Math.max(0, ((agg[`${p}_sq`] as number) ?? 0) - mean * mean);
    stats[key] = {
      mean: round(mean, 4),
      std: round(Math.sqrt(variance), 4),
      min: round((agg[`${p}_min`] as number) ?? 0, 4),
      max: round((agg[`${p}_max`] as number) ?? 0, 4),
      p95: round(p95(key), 4),
      exceedancePct: n ? round(((agg[`${p}_over`] as number) / n) * 100, 2) : 0,
      slopePerHour: (() => {
        const s = slope(hours, buckets.map((b) => b[key]));
        return s === null ? null : round(s, 4);
      })(),
    };
  }

  const correlation = {} as AnalyticsResponse['correlation'];
  for (const a of SENSOR_KEYS) {
    correlation[a] = {} as Record<SensorKey, number | null>;
    for (const b of SENSOR_KEYS) {
      const r = a === b ? 1 : pearson(buckets.map((x) => x[a]), buckets.map((x) => x[b]));
      correlation[a][b] = r === null ? null : round(r, 3);
    }
  }

  // Alert counts per time bucket (24 bars across the window)
  const alertBucket = Math.max(1000, Math.ceil(spanMs / 24 / 1000) * 1000);
  const firstBucket = Math.floor(from / alertBucket) * alertBucket;
  const alertRows = db
    .prepare(
      `SELECT CAST(started_at / ? AS INTEGER) * ? AS b, type, COUNT(*) AS n
       FROM alerts WHERE machine_id = ? AND started_at >= ? AND type != 'lubrication' GROUP BY b, type`
    )
    .all(alertBucket, alertBucket, MACHINE_ID, from) as { b: number; type: SensorKey; n: number }[];
  const alertsByBucket: AnalyticsResponse['alertsByBucket'] = [];
  for (let ts = firstBucket; ts <= to; ts += alertBucket) {
    alertsByBucket.push({ ts, vibration: 0, temperature: 0, current: 0 });
  }
  const alertTotals: Record<SensorKey, number> = { vibration: 0, temperature: 0, current: 0 };
  for (const r of alertRows) {
    const slot = alertsByBucket.find((x) => x.ts === r.b);
    if (slot) slot[r.type] = r.n;
    alertTotals[r.type] += r.n;
  }

  const lube = db
    .prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(trigger = 'auto'), 0) AS auto FROM lubrication_events WHERE machine_id = ? AND started_at >= ?`
    )
    .get(MACHINE_ID, from) as { n: number; auto: number };

  return {
    range,
    samples: n,
    from,
    to,
    thresholds,
    stats,
    compliancePct: n ? round((((agg.ok as number) ?? 0) / n) * 100, 2) : 100,
    correlation,
    alertsByBucket,
    alertTotals,
    mqlCycles: { total: lube.n, auto: lube.auto },
    observations: buildObservations({ n, spanMs, stats, thresholds, correlation, alertTotals, lube }),
  };
}

function buildObservations(ctx: {
  n: number;
  spanMs: number;
  stats: Record<SensorKey, SensorStats>;
  thresholds: Record<SensorKey, number>;
  correlation: AnalyticsResponse['correlation'];
  alertTotals: Record<SensorKey, number>;
  lube: { n: number; auto: number };
}): AnalyticsResponse['observations'] {
  const out: AnalyticsResponse['observations'] = [];
  if (ctx.n < 30) {
    out.push({ level: 'info', text: `Only ${ctx.n} samples in this window — statistics are not meaningful yet.` });
    return out;
  }

  for (const key of SENSOR_KEYS) {
    const m = SENSORS[key];
    const s = ctx.stats[key];
    const limit = ctx.thresholds[key];
    const fmt = (v: number) => `${v.toFixed(m.decimals)} ${m.unit}`;
    if (s.exceedancePct > 0) {
      out.push({
        level: 'warn',
        text: `${m.label} exceeded its ${fmt(limit)} limit in ${s.exceedancePct.toFixed(2)}% of samples (peak ${fmt(s.max)}, ${ctx.alertTotals[key]} alert${ctx.alertTotals[key] === 1 ? '' : 's'}).`,
      });
    } else if (s.max > 0.9 * limit) {
      out.push({
        level: 'info',
        text: `${m.label} stayed within limit but peaked at ${Math.round((s.max / limit) * 100)}% of it (${fmt(s.max)}).`,
      });
    } else {
      out.push({
        level: 'ok',
        text: `${m.label} stayed within limit (peak ${fmt(s.max)}, ${Math.round((s.max / limit) * 100)}% of limit).`,
      });
    }

    const hours = ctx.spanMs / 3_600_000;
    if (hours >= 1 && s.slopePerHour !== null && Math.abs(s.slopePerHour * hours) >= 0.1 * limit) {
      out.push({
        level: 'info',
        text: `${m.label} shows a ${s.slopePerHour > 0 ? 'rising' : 'falling'} drift of ${fmt(Math.abs(s.slopePerHour))} per hour across this window.`,
      });
    }
  }

  const r = ctx.correlation.temperature.vibration;
  const anyAlerts = Object.values(ctx.alertTotals).some((v) => v > 0);
  if (anyAlerts && r !== null && r > 0.7) {
    out.push({
      level: 'info',
      text: `Temperature and vibration moved together (r = ${r.toFixed(2)}), which may point to a single load or friction event rather than an isolated sensor fault.`,
    });
  }

  if (ctx.lube.n > 0) {
    out.push({
      level: 'info',
      text: `MQL lubrication ran ${ctx.lube.n} time${ctx.lube.n === 1 ? '' : 's'} (${ctx.lube.auto} automatic).`,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* CSV export                                                          */
/* ------------------------------------------------------------------ */

const iso = (ts: number | null) => (ts === null ? '' : new Date(ts).toISOString());

export function exportCsv(kind: 'readings' | 'alerts' | 'lubrication', range: RangeKey | 'all'): string {
  const db = getDb();
  const since = range === 'all' ? 0 : Date.now() - RANGE_MS[range];
  const lines: string[] = [];
  const esc = (v: string | number | null) => {
    if (v === null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  if (kind === 'readings') {
    lines.push('timestamp,vibration_g,temperature_c,current_a,source,fault_label');
    const rows = db
      .prepare(
        `SELECT ts, vibration, temperature, current, source, fault FROM readings WHERE machine_id = ? AND ts >= ? ORDER BY ts`
      )
      .iterate(MACHINE_ID, since) as IterableIterator<{
      ts: number;
      vibration: number;
      temperature: number;
      current: number;
      source: string;
      fault: number | null;
    }>;
    for (const r of rows) lines.push([iso(r.ts), r.vibration, r.temperature, r.current, r.source, r.fault].map(esc).join(','));
  } else if (kind === 'alerts') {
    lines.push('started_at,resolved_at,type,severity,message,first_value,threshold,peak,status,samples');
    const rows = db
      .prepare(`SELECT * FROM alerts WHERE machine_id = ? AND started_at >= ? ORDER BY started_at`)
      .all(MACHINE_ID, since) as AlertDbRow[];
    for (const r of rows) {
      lines.push(
        [iso(r.started_at), iso(r.resolved_at), r.type, r.severity, r.message, r.value, r.threshold, r.peak, r.status, r.samples]
          .map(esc)
          .join(',')
      );
    }
  } else {
    lines.push('started_at,ended_at,trigger,temperature_at_start_c,duration_s,estimated_volume_ml');
    const rows = db
      .prepare(`SELECT * FROM lubrication_events WHERE machine_id = ? AND started_at >= ? ORDER BY started_at`)
      .all(MACHINE_ID, since) as {
      started_at: number;
      ended_at: number | null;
      trigger: string;
      temp_at_start: number | null;
      duration_s: number;
      volume_ml: number;
    }[];
    for (const r of rows) {
      lines.push([iso(r.started_at), iso(r.ended_at), r.trigger, r.temp_at_start, r.duration_s, r.volume_ml].map(esc).join(','));
    }
  }
  return lines.join('\n') + '\n';
}
