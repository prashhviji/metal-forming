import { getDb, MACHINE_ID } from './db';
import type { AppSettings, MachineInfo } from '@/types/monitor';

export const DEFAULT_SETTINGS: AppSettings = {
  thresholds: { vibration: 0.3, temperature: 45, current: 3.0 },
  mql: {
    enabled: true,
    activationTemp: 42,
    sprayDuration: 10,
    cooldown: 30,
    flowRate: 0.2,
  },
  engine: { source: 'simulator', intervalMs: 1000, paused: false },
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

const g = globalThis as unknown as { __cncSettings?: AppSettings };

function num(label: string, v: unknown, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${label} must be a number`);
  if (v < min || v > max) throw new Error(`${label} must be between ${min} and ${max}`);
  return v;
}

function bool(label: string, v: unknown): boolean {
  if (typeof v !== 'boolean') throw new Error(`${label} must be true or false`);
  return v;
}

/** Merge a partial update into current settings, validating every field it touches. */
export function mergeSettings(current: AppSettings, patch: DeepPartial<AppSettings>): AppSettings {
  const next: AppSettings = JSON.parse(JSON.stringify(current));

  const t = patch.thresholds;
  if (t) {
    if (t.vibration !== undefined) next.thresholds.vibration = num('Vibration limit', t.vibration, 0.01, 10);
    if (t.temperature !== undefined) next.thresholds.temperature = num('Temperature limit', t.temperature, 20, 200);
    if (t.current !== undefined) next.thresholds.current = num('Current limit', t.current, 0.1, 100);
  }

  const m = patch.mql;
  if (m) {
    if (m.enabled !== undefined) next.mql.enabled = bool('MQL enabled', m.enabled);
    if (m.activationTemp !== undefined) next.mql.activationTemp = num('Activation temperature', m.activationTemp, 20, 200);
    if (m.sprayDuration !== undefined) next.mql.sprayDuration = num('Spray duration', m.sprayDuration, 1, 600);
    if (m.cooldown !== undefined) next.mql.cooldown = num('Cooldown', m.cooldown, 0, 3600);
    if (m.flowRate !== undefined) next.mql.flowRate = num('Flow rate', m.flowRate, 0.001, 10);
  }

  const e = patch.engine;
  if (e) {
    if (e.source !== undefined) {
      if (e.source !== 'simulator' && e.source !== 'hardware') throw new Error('Data source must be simulator or hardware');
      next.engine.source = e.source;
    }
    if (e.intervalMs !== undefined) next.engine.intervalMs = Math.round(num('Sample interval', e.intervalMs, 250, 60000));
    if (e.paused !== undefined) next.engine.paused = bool('Paused', e.paused);
  }

  return next;
}

export function getSettings(): AppSettings {
  if (g.__cncSettings) return g.__cncSettings;
  const row = getDb().prepare(`SELECT value FROM settings WHERE key = 'app'`).get() as
    | { value: string }
    | undefined;

  let stored: DeepPartial<AppSettings> = {};
  if (row) {
    try {
      stored = JSON.parse(row.value);
    } catch {
      stored = {};
    }
  }
  let merged: AppSettings;
  try {
    merged = mergeSettings(DEFAULT_SETTINGS, stored);
  } catch {
    merged = DEFAULT_SETTINGS;
  }
  g.__cncSettings = merged;
  return merged;
}

export function saveSettings(patch: DeepPartial<AppSettings>): AppSettings {
  const next = mergeSettings(getSettings(), patch);
  getDb()
    .prepare(`INSERT INTO settings (key, value) VALUES ('app', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
    .run(JSON.stringify(next));
  g.__cncSettings = next;
  return next;
}

export function getMachine(): MachineInfo {
  return getDb()
    .prepare(`SELECT id, name, type, location FROM machines WHERE id = ?`)
    .get(MACHINE_ID) as MachineInfo;
}

export function saveMachine(patch: Partial<Pick<MachineInfo, 'name' | 'type' | 'location'>>): MachineInfo {
  const cur = getMachine();
  const clean = (label: string, v: unknown, fallback: string) => {
    if (v === undefined) return fallback;
    if (typeof v !== 'string' || !v.trim()) throw new Error(`${label} cannot be empty`);
    if (v.length > 60) throw new Error(`${label} must be 60 characters or fewer`);
    return v.trim();
  };
  const next = {
    name: clean('Machine name', patch.name, cur.name),
    type: clean('Machine type', patch.type, cur.type),
    location: clean('Location', patch.location, cur.location),
  };
  getDb()
    .prepare(`UPDATE machines SET name = ?, type = ?, location = ? WHERE id = ?`)
    .run(next.name, next.type, next.location, MACHINE_ID);
  return { id: MACHINE_ID, ...next };
}
