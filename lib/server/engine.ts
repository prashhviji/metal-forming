import type Database from 'better-sqlite3';
import { getDb, MACHINE_ID, clearAllData, dbSizeBytes, dbFilePath } from './db';
import { getSettings, saveSettings, getMachine } from './settings';
import { SENSOR_KEYS, SENSORS, alertMessage } from '@/lib/sensors';
import type {
  AppSettings,
  MqlState,
  Reading,
  SensorKey,
  StatusResponse,
} from '@/types/monitor';

/**
 * Sensor engine.
 *
 * - Every reading (from the built-in simulator or POSTed by real hardware) goes through
 *   `processReading`, which stores it, raises / resolves threshold alerts and runs the
 *   temperature-triggered MQL lubrication rule.
 * - State lives on globalThis so hot reloads and the instrumentation bundle share it.
 */

const CLEAR_SAMPLES = 3; // consecutive in-range samples before an alert auto-resolves
const SEED_MINUTES = 60;
const RETENTION_MS = 7 * 24 * 3600 * 1000;
const STALE_AFTER_MS = 10_000;

interface OpenAlert {
  id: number;
  clear: number;
}

interface MqlRuntime {
  valveOn: boolean;
  trigger: 'auto' | 'manual' | null;
  startedAt: number;
  endsAt: number | null;
  cooldownUntil: number;
  eventId: number | null;
  alertId: number | null;
}

interface SimRuntime {
  temp: number;
  lastTs: number;
  nextFaultAt: number;
  fault: { start: number; end: number; intensity: number } | null;
}

interface Runtime {
  timer: ReturnType<typeof setInterval> | null;
  tick: (() => void) | null;
  mql: MqlRuntime;
  open: Partial<Record<SensorKey, OpenAlert>>;
  sim: SimRuntime;
  lastPrune: number;
  counts: { at: number; readings: number; alerts: number; events: number };
}

const g = globalThis as unknown as { __cncEngine?: Runtime };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const noise = (amp: number) => (Math.random() + Math.random() + Math.random() - 1.5) * 2 * amp;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

function freshMql(): MqlRuntime {
  return { valveOn: false, trigger: null, startedAt: 0, endsAt: null, cooldownUntil: 0, eventId: null, alertId: null };
}

function freshSim(now = Date.now()): SimRuntime {
  return { temp: 38, lastTs: 0, nextFaultAt: now + 40_000, fault: null };
}

/* ------------------------------------------------------------------ */
/* Runtime bootstrap                                                   */
/* ------------------------------------------------------------------ */

function runtime(): Runtime {
  let rt = g.__cncEngine;
  if (!rt) {
    const db = getDb();
    rt = {
      timer: null,
      tick: null,
      mql: freshMql(),
      open: {},
      sim: freshSim(),
      lastPrune: 0,
      counts: { at: 0, readings: 0, alerts: 0, events: 0 },
    };
    g.__cncEngine = rt;
    recoverFromRestart(db, rt);

    const empty = (db.prepare('SELECT COUNT(*) AS n FROM readings').get() as { n: number }).n === 0;
    if (empty && getSettings().engine.source === 'simulator') seedHistory(rt, SEED_MINUTES);
  }
  // Always point the timer at the newest module code (matters during dev hot reloads).
  rt.tick = tick;
  return rt;
}

export function startEngine() {
  const rt = runtime();
  if (!rt.timer) {
    rt.timer = setInterval(() => g.__cncEngine?.tick?.(), 500);
    rt.timer.unref?.();
  }
}

/** Close anything left open by a previous process (sprays / alerts that never got an end). */
function recoverFromRestart(db: Database.Database, rt: Runtime) {
  const flow = getSettings().mql.flowRate;
  db.transaction(() => {
    const orphans = db
      .prepare(`SELECT id, started_at, duration_s FROM lubrication_events WHERE ended_at IS NULL`)
      .all() as { id: number; started_at: number; duration_s: number }[];
    for (const o of orphans) {
      db.prepare(`UPDATE lubrication_events SET ended_at = ?, volume_ml = ? WHERE id = ?`).run(
        o.started_at + o.duration_s * 1000,
        round(o.duration_s * flow, 3),
        o.id
      );
    }
    db.prepare(
      `UPDATE alerts SET status = 'resolved', resolved_at = COALESCE(resolved_at, started_at) WHERE type = 'lubrication' AND status != 'resolved'`
    ).run();

    for (const key of SENSOR_KEYS) {
      const rows = db
        .prepare(`SELECT id FROM alerts WHERE machine_id = ? AND type = ? AND status != 'resolved' ORDER BY id DESC`)
        .all(MACHINE_ID, key) as { id: number }[];
      if (rows.length) rt.open[key] = { id: rows[0].id, clear: 0 };
      for (const stale of rows.slice(1)) {
        db.prepare(`UPDATE alerts SET status = 'resolved', resolved_at = started_at WHERE id = ?`).run(stale.id);
      }
    }
  })();
}

/* ------------------------------------------------------------------ */
/* Reading pipeline                                                    */
/* ------------------------------------------------------------------ */

type Values = Pick<Reading, SensorKey>;

function processReading(
  rt: Runtime,
  ts: number,
  vals: Values,
  source: 'simulator' | 'hardware',
  fault: 0 | 1 | null = null
) {
  const db = getDb();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO readings (machine_id, ts, vibration, temperature, current, source, fault) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(MACHINE_ID, ts, vals.vibration, vals.temperature, vals.current, source, fault);

    evaluateAlerts(db, rt, ts, vals);
    controlMql(db, rt, ts, vals.temperature);
  })();
}

function evaluateAlerts(db: Database.Database, rt: Runtime, ts: number, vals: Values) {
  const limits = getSettings().thresholds;

  for (const key of SENSOR_KEYS) {
    const value = vals[key];
    const limit = limits[key];
    const open = rt.open[key];

    if (value > limit) {
      if (open) {
        open.clear = 0;
        db.prepare(`UPDATE alerts SET peak = MAX(COALESCE(peak, ?), ?), samples = samples + 1 WHERE id = ?`).run(
          value,
          value,
          open.id
        );
      } else {
        const res = db
          .prepare(
            `INSERT INTO alerts (machine_id, type, severity, message, value, threshold, peak, status, started_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`
          )
          .run(MACHINE_ID, key, SENSORS[key].severity, alertMessage(key, limit), value, limit, value, ts);
        rt.open[key] = { id: Number(res.lastInsertRowid), clear: 0 };
      }
    } else if (open) {
      open.clear += 1;
      if (open.clear >= CLEAR_SAMPLES) {
        db.prepare(`UPDATE alerts SET status = 'resolved', resolved_at = ? WHERE id = ?`).run(ts, open.id);
        delete rt.open[key];
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* MQL lubrication control                                             */
/* ------------------------------------------------------------------ */

function controlMql(db: Database.Database, rt: Runtime, ts: number, temperature: number) {
  const cfg = getSettings().mql;
  const m = rt.mql;

  if (m.valveOn) {
    const autoDisabled = !cfg.enabled && m.trigger === 'auto';
    if (autoDisabled || (m.endsAt !== null && ts >= m.endsAt)) stopSpray(db, rt, ts);
    return;
  }

  if (cfg.enabled && temperature >= cfg.activationTemp && ts >= m.cooldownUntil) {
    startSpray(db, rt, ts, 'auto', temperature);
  }
}

function startSpray(db: Database.Database, rt: Runtime, ts: number, trigger: 'auto' | 'manual', temp: number | null) {
  const cfg = getSettings().mql;
  const m = rt.mql;

  const ev = db
    .prepare(
      `INSERT INTO lubrication_events (machine_id, started_at, trigger, temp_at_start, duration_s) VALUES (?, ?, ?, ?, ?)`
    )
    .run(MACHINE_ID, ts, trigger, temp, cfg.sprayDuration);

  const message =
    trigger === 'auto'
      ? `MQL activated automatically at ${temp?.toFixed(1)} °C`
      : `MQL spray started manually`;
  const al = db
    .prepare(
      `INSERT INTO alerts (machine_id, type, severity, message, value, threshold, peak, status, started_at)
       VALUES (?, 'lubrication', 'Info', ?, ?, ?, ?, 'active', ?)`
    )
    .run(MACHINE_ID, message, temp, trigger === 'auto' ? cfg.activationTemp : null, temp, ts);

  m.valveOn = true;
  m.trigger = trigger;
  m.startedAt = ts;
  m.endsAt = ts + cfg.sprayDuration * 1000;
  m.eventId = Number(ev.lastInsertRowid);
  m.alertId = Number(al.lastInsertRowid);
}

function stopSpray(db: Database.Database, rt: Runtime, ts: number) {
  const cfg = getSettings().mql;
  const m = rt.mql;
  if (!m.valveOn) return;

  const endedAt = m.endsAt !== null ? Math.min(ts, m.endsAt) : ts;
  const durationS = Math.max(0, (endedAt - m.startedAt) / 1000);

  if (m.eventId !== null) {
    db.prepare(`UPDATE lubrication_events SET ended_at = ?, duration_s = ?, volume_ml = ? WHERE id = ?`).run(
      endedAt,
      round(durationS, 2),
      round(durationS * cfg.flowRate, 3),
      m.eventId
    );
  }
  if (m.alertId !== null) {
    db.prepare(`UPDATE alerts SET status = 'resolved', resolved_at = ? WHERE id = ?`).run(endedAt, m.alertId);
  }

  rt.mql = { ...freshMql(), cooldownUntil: ts + cfg.cooldown * 1000 };
}

export function getMqlState(now = Date.now()): MqlState {
  const rt = runtime();
  const cfg = getSettings().mql;
  const m = rt.mql;
  const phase = m.valveOn ? 'spraying' : !cfg.enabled ? 'disabled' : now < m.cooldownUntil ? 'cooldown' : 'armed';
  return {
    enabled: cfg.enabled,
    valve: m.valveOn ? 'on' : 'off',
    phase,
    trigger: m.trigger,
    sprayEndsAt: m.valveOn ? m.endsAt : null,
    cooldownEndsAt: !m.valveOn && now < m.cooldownUntil ? m.cooldownUntil : null,
  };
}

/** Manual "spray now" — works even when automatic control is disabled. */
export function sprayNow(): MqlState {
  const rt = runtime();
  if (!rt.mql.valveOn) {
    const db = getDb();
    const last = latestReading(db);
    startSpray(db, rt, Date.now(), 'manual', last?.temperature ?? null);
  }
  return getMqlState();
}

/** Manual stop of a spray cycle that is currently running. */
export function stopSprayNow(): MqlState {
  const rt = runtime();
  if (rt.mql.valveOn) stopSpray(getDb(), rt, Date.now());
  return getMqlState();
}

/** Called after settings change so a running auto spray reacts to being disabled. */
export function onSettingsChanged() {
  const rt = runtime();
  const cfg = getSettings().mql;
  if (rt.mql.valveOn && !cfg.enabled && rt.mql.trigger === 'auto') stopSpray(getDb(), rt, Date.now());
}

/* ------------------------------------------------------------------ */
/* Simulator                                                           */
/* ------------------------------------------------------------------ */

/** A simulated fault counts as "in progress" once its envelope is clearly above the noise (>= 20% of peak). */
const FAULT_LABEL_ENVELOPE = 0.2;

function simStep(rt: Runtime, ts: number, dt: number): Values & { fault: 0 | 1 } {
  const s = rt.sim;
  const t = ts / 1000;

  // Slowly varying cutting load (0.35 – 0.95)
  const load = 0.65 + 0.2 * Math.sin((2 * Math.PI * t) / 47) + 0.1 * Math.sin((2 * Math.PI * t) / 13);

  // Occasional fault episodes: bearing/tool trouble raises all three channels together.
  if (!s.fault && ts >= s.nextFaultAt) {
    s.fault = { start: ts, end: ts + rand(12_000, 20_000), intensity: rand(0.75, 1.15) };
  }
  let env = 0;
  if (s.fault) {
    const p = (ts - s.fault.start) / (s.fault.end - s.fault.start);
    if (p >= 1) {
      s.fault = null;
      s.nextFaultAt = ts + rand(180_000, 540_000);
    } else {
      env = Math.sin(Math.PI * p) * s.fault.intensity;
    }
  }

  const vibration = 0.13 + 0.035 * load + noise(0.012) + env * 0.23;
  const current = 1.85 + 0.55 * load + noise(0.06) + env * 1.35;

  // Temperature follows a heat target with thermal lag; an open MQL valve pulls it down.
  const target = 36 + 3.5 * load + env * 14;
  s.temp += (target - s.temp) * (1 - Math.exp(-dt / 7));
  // Spray cooling stops just below the heat target, so it can't pull the spindle under its normal running temperature.
  if (rt.mql.valveOn && s.temp > target - 1.5) s.temp = Math.max(target - 1.5, s.temp - 0.8 * dt);

  return {
    vibration: round(Math.max(0.01, vibration), 3),
    temperature: round(s.temp + noise(0.15), 2),
    current: round(Math.max(0.1, current), 3),
    fault: env >= FAULT_LABEL_ENVELOPE ? 1 : 0,
  };
}

function seedHistory(rt: Runtime, minutes: number) {
  const end = Date.now();
  const start = end - minutes * 60_000;
  rt.sim = freshSim(start);
  rt.sim.nextFaultAt = start + 90_000;

  getDb().transaction(() => {
    for (let ts = start; ts <= end; ts += 1000) {
      const { fault, ...vals } = simStep(rt, ts, 1);
      processReading(rt, ts, vals, 'simulator', fault);
    }
  })();

  rt.sim.lastTs = end;
  rt.sim.nextFaultAt = end + 40_000;
}

/** Force a fault episode in the simulator (demo / testing). */
export function injectFault(): boolean {
  const rt = runtime();
  if (getSettings().engine.source !== 'simulator') return false;
  const now = Date.now();
  rt.sim.fault = { start: now, end: now + 16_000, intensity: rand(1.0, 1.15) };
  return true;
}

/* ------------------------------------------------------------------ */
/* Timer                                                               */
/* ------------------------------------------------------------------ */

function tick() {
  try {
    const rt = g.__cncEngine;
    if (!rt) return;
    const db = getDb();
    const now = Date.now();
    const { engine } = getSettings();

    // The spray timer must run even if no readings arrive.
    if (rt.mql.valveOn && rt.mql.endsAt !== null && now >= rt.mql.endsAt) stopSpray(db, rt, now);

    if (engine.source === 'simulator' && !engine.paused && now - rt.sim.lastTs >= engine.intervalMs) {
      const dt = rt.sim.lastTs ? clamp((now - rt.sim.lastTs) / 1000, 0.1, 5) : engine.intervalMs / 1000;
      rt.sim.lastTs = now;
      const { fault, ...vals } = simStep(rt, now, dt);
      processReading(rt, now, vals, 'simulator', fault);
    }

    if (now - rt.lastPrune > 10 * 60_000) {
      rt.lastPrune = now;
      db.prepare(`DELETE FROM readings WHERE ts < ?`).run(now - RETENTION_MS);
    }
  } catch (err) {
    console.error('[engine] tick failed:', err);
  }
}

/* ------------------------------------------------------------------ */
/* Public API used by route handlers                                   */
/* ------------------------------------------------------------------ */

export function ensureEngine() {
  startEngine();
}

export interface IngestResult {
  ts: number;
  mql: MqlState;
  alerts: { active: number };
}

/** Hardware ingestion: store a reading and report what the actuators should do. */
export function ingestReading(vals: Values): IngestResult {
  ensureEngine();
  const rt = runtime();
  const ts = Date.now();
  processReading(rt, ts, vals, 'hardware');
  return { ts, mql: getMqlState(ts), alerts: { active: Object.keys(rt.open).length } };
}

export function latestReading(db = getDb()): Reading | null {
  const row = db
    .prepare(
      `SELECT ts, vibration, temperature, current FROM readings WHERE machine_id = ? ORDER BY ts DESC, id DESC LIMIT 1`
    )
    .get(MACHINE_ID) as Reading | undefined;
  return row ?? null;
}

export function applySettings(patch: Parameters<typeof saveSettings>[0]): AppSettings {
  ensureEngine();
  const next = saveSettings(patch);
  onSettingsChanged();
  return next;
}

/** Remove all recorded data. Optionally regenerate 1–72 h of labelled simulated history. */
export function resetData(opts: { reseed: boolean; hours?: number }) {
  const rt = runtime();
  clearAllData();
  rt.open = {};
  rt.mql = freshMql();
  rt.sim = freshSim();
  rt.counts.at = 0;
  if (opts.reseed && getSettings().engine.source === 'simulator') {
    const hours = clamp(opts.hours ?? SEED_MINUTES / 60, 1, 72);
    seedHistory(rt, Math.round(hours * 60));
  }
}

export function getStatus(): StatusResponse {
  ensureEngine();
  const rt = runtime();
  const db = getDb();
  const now = Date.now();
  const settings = getSettings();
  const latest = latestReading(db);
  const ageMs = latest ? Math.max(0, now - latest.ts) : null;

  let link: StatusResponse['link'];
  if (!latest) link = 'empty';
  else if (settings.engine.source === 'simulator' && settings.engine.paused) link = 'paused';
  else link = ageMs !== null && ageMs > Math.max(STALE_AFTER_MS, settings.engine.intervalMs * 4) ? 'stale' : 'live';

  if (now - rt.counts.at > 5000) {
    const n = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
    rt.counts = {
      at: now,
      readings: n('SELECT COUNT(*) AS n FROM readings'),
      alerts: n('SELECT COUNT(*) AS n FROM alerts'),
      events: n('SELECT COUNT(*) AS n FROM lubrication_events'),
    };
  }

  const a = db
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'active' AND type != 'lubrication' THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN status = 'acknowledged' AND type != 'lubrication' THEN 1 ELSE 0 END) AS acknowledged,
         SUM(CASE WHEN status != 'resolved' AND severity = 'Critical' THEN 1 ELSE 0 END) AS critical
       FROM alerts WHERE machine_id = ? AND status != 'resolved'`
    )
    .get(MACHINE_ID) as { active: number | null; acknowledged: number | null; critical: number | null };

  return {
    now,
    machine: getMachine(),
    source: settings.engine.source,
    engine: { paused: settings.engine.paused, intervalMs: settings.engine.intervalMs },
    latest,
    ageMs,
    link,
    thresholds: settings.thresholds,
    mql: getMqlState(now),
    mqlConfig: settings.mql,
    alerts: { active: a.active ?? 0, acknowledged: a.acknowledged ?? 0, critical: a.critical ?? 0 },
    db: {
      readings: rt.counts.readings,
      alerts: rt.counts.alerts,
      events: rt.counts.events,
      sizeBytes: dbSizeBytes(),
      path: dbFilePath(),
    },
  };
}
