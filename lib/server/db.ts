import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// Local SQLite database. The handle lives on globalThis so Next.js hot reloads
// and the separately-bundled instrumentation hook all share one connection.
const g = globalThis as unknown as { __cncDb?: Database.Database };

export const MACHINE_ID = 'CNC-001';

export function dbFilePath() {
  const dir = process.env.CNC_DB_DIR ?? path.join(process.cwd(), 'data');
  return path.join(dir, 'cnc-monitor.db');
}

const SCHEMA_V1 = `
CREATE TABLE machines (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  type      TEXT NOT NULL,
  location  TEXT NOT NULL
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE readings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_id  TEXT    NOT NULL REFERENCES machines(id),
  ts          INTEGER NOT NULL,           -- epoch milliseconds
  vibration   REAL    NOT NULL,           -- g
  temperature REAL    NOT NULL,           -- °C
  current     REAL    NOT NULL,           -- A
  source      TEXT    NOT NULL            -- 'simulator' | 'hardware'
);
CREATE INDEX idx_readings_machine_ts ON readings(machine_id, ts);

CREATE TABLE alerts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_id      TEXT    NOT NULL REFERENCES machines(id),
  type            TEXT    NOT NULL,       -- vibration | temperature | current | lubrication
  severity        TEXT    NOT NULL,       -- Critical | High | Medium | Info
  message         TEXT    NOT NULL,
  value           REAL,                   -- first violating value
  threshold       REAL,
  peak            REAL,                   -- worst value while the alert was open
  status          TEXT    NOT NULL,       -- active | acknowledged | resolved
  started_at      INTEGER NOT NULL,
  resolved_at     INTEGER,
  acknowledged_at INTEGER,
  samples         INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_alerts_machine_started ON alerts(machine_id, started_at);
CREATE INDEX idx_alerts_status ON alerts(machine_id, status);

CREATE TABLE lubrication_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_id    TEXT    NOT NULL REFERENCES machines(id),
  started_at    INTEGER NOT NULL,
  ended_at      INTEGER,
  trigger       TEXT    NOT NULL,         -- auto | manual
  temp_at_start REAL,
  duration_s    REAL    NOT NULL DEFAULT 0,
  volume_ml     REAL    NOT NULL DEFAULT 0  -- estimated from configured flow rate
);
CREATE INDEX idx_lube_machine_started ON lubrication_events(machine_id, started_at);
`;

// v2: ground-truth label for ML work. 1 = simulated fault in progress, 0 = normal,
// NULL = unlabelled (real hardware readings).
const SCHEMA_V2 = `ALTER TABLE readings ADD COLUMN fault INTEGER;`;

const MIGRATIONS: string[] = [SCHEMA_V1, SCHEMA_V2];

function migrate(db: Database.Database) {
  const current = db.pragma('user_version', { simple: true }) as number;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }

  db.prepare(
    `INSERT OR IGNORE INTO machines (id, name, type, location) VALUES (?, ?, ?, ?)`
  ).run(MACHINE_ID, 'CNC Machine 01', 'CNC machining centre', 'Machine shop');
}

export function getDb(): Database.Database {
  if (g.__cncDb) return g.__cncDb;

  const file = dbFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  migrate(db);

  g.__cncDb = db;
  return db;
}

/** Wipe every table (keeps the schema). Used by "reset database". */
export function clearAllData() {
  const db = getDb();
  db.transaction(() => {
    db.exec(`
      DELETE FROM readings;
      DELETE FROM alerts;
      DELETE FROM lubrication_events;
      DELETE FROM sqlite_sequence WHERE name IN ('readings','alerts','lubrication_events');
    `);
  })();
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.exec('VACUUM');
}

export function dbSizeBytes() {
  const file = dbFilePath();
  let size = 0;
  for (const f of [file, `${file}-wal`]) {
    try {
      size += fs.statSync(f).size;
    } catch {
      /* file may not exist yet */
    }
  }
  return size;
}
