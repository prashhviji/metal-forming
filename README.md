# CNC Monitor — Predictive Maintenance & MQL Lubrication

CIM project (Department of Mechanical Engineering, VIT Chennai): a web dashboard that monitors a CNC machine's
**vibration, temperature and motor current**, raises **threshold alerts**, and runs a **temperature-triggered MQL
(minimum quantity lubrication)** control rule. Everything is stored in a **local SQLite database** — no cloud service.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Chart.js and `better-sqlite3`.

> **Honest status.** Alerts are fixed-threshold checks. No trained prediction model exists, and no accuracy,
> downtime or tool-life claims are made. Until the sensor node posts real readings, the app runs on a built-in
> **simulator** and says so in the header of every page. See *About* in the app for the validation plan.

## Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. On first start the app creates `data/cnc-monitor.db` and fills it with one hour of
simulated history so every page has something to show. Requires Node 20 or newer.

If `better-sqlite3` fails to load after install (native module), run `npm rebuild better-sqlite3`.

## Pages

| Page | What it does |
|------|--------------|
| **Dashboard** | Live values with sparklines, MQL status, all sensors as % of their limit on one chart, recent alerts, last-hour summary |
| **Live Data** | Per-sensor charts for 5 min – 24 h (peak per bucket), pause, latest samples, CSV export |
| **Analytics** | Mean / std / min / max / p95, share of time over limit, drift per hour, sensor correlation, alerts over time, plain-language observations |
| **Alerts** | Alert history with status (active / acknowledged / resolved), filters, acknowledge, CSV export |
| **Lubrication** | MQL state, automatic on/off, manual spray, tuning (activation °C, spray s, cooldown s, nozzle ml/s), spray log and 1 h activity chart |
| **Settings** | Data source (simulator / hardware), alert limits, machine profile, database info, CSV export, clear data |
| **About** | Project description, architecture, implementation status and validation plan |

## How it works

1. A reading (`vibration`, `temperature`, `current`) arrives — from the simulator or `POST /api/readings`.
2. It is stored, then compared with the alert limits. A limit breach opens an alert (severity: vibration *Critical*,
   temperature *High*, current *Medium*); three consecutive in-range readings resolve it.
3. The MQL rule runs on the same reading: if automatic control is enabled and `temperature ≥ activation temp` and the
   cooldown has passed, the valve opens for the spray duration. The spray is logged with an **estimated** volume
   (`duration × nozzle flow`) — calibrate the flow against measured lubricant before quoting numbers.

Defaults: vibration 0.3 g · temperature 45 °C · current 3.0 A · MQL at 42 °C, 10 s spray, 30 s cooldown, 0.2 ml/s.

## Connecting the real sensor node

In **Settings → Data source** choose *Hardware sensors*, then send one JSON reading per sample:

```bash
curl -X POST http://<this-computer-ip>:3000/api/readings \
  -H "Content-Type: application/json" \
  -d '{"vibration":0.18,"temperature":39.5,"current":2.2}'
```

The reply contains the lubrication valve command, so the microcontroller needs no extra request:

```json
{ "ok": true, "ts": 1793249356260, "mql": { "enabled": true, "valve": "off", "phase": "armed" }, "alerts": { "active": 0 } }
```

Open or close the valve when `mql.valve` is `"on"` / `"off"`. To reach the app from another device on the network, start it
with `npm run dev -- -H 0.0.0.0`. An ESP32 example is in Settings. In simulator mode this endpoint answers `409`.

## API

All routes return JSON (`Cache-Control: no-store`); errors are `{ "error": "…" }`.

| Route | Purpose |
|-------|---------|
| `GET /api/status` | Latest reading, link state, thresholds, MQL state, open-alert counts, DB stats |
| `GET /api/readings?range=5m\|15m\|1h\|6h\|24h` | Peak-per-bucket time series (~300 points) |
| `POST /api/readings` | Hardware ingestion (see above) |
| `GET /api/alerts?status=&type=&limit=&offset=` · `POST /api/alerts` | List; `{action:"acknowledge",id}` or `{action:"acknowledge_all"}` |
| `GET /api/lubrication` · `POST /api/lubrication` | MQL summary and log; `{action:"spray_now"\|"stop"}` |
| `GET /api/settings` · `PUT /api/settings` | Thresholds, MQL config, engine config, machine profile (partial updates, validated) |
| `GET /api/analytics?range=` | Statistics, correlation, alert buckets, observations |
| `GET /api/export?kind=readings\|alerts\|lubrication&range=` | CSV download |
| `POST /api/system` | `{action:"inject_fault"}` (simulator) or `{action:"reset_data",reseed}` |

## Database

SQLite file at `data/cnc-monitor.db` (git-ignored; override the folder with `CNC_DB_DIR`). Tables: `machines`,
`settings`, `readings`, `alerts`, `lubrication_events`; the schema is versioned with `PRAGMA user_version` in
[`lib/server/db.ts`](lib/server/db.ts). Readings older than 7 days are pruned; alerts and spray events are kept.
To start over, use *Settings → Clear data* or delete the `data/` folder while the server is stopped.

## Project layout

```
app/(app)/            pages: dashboard, live, analytics, alerts, lubrication, settings, about
app/api/              route handlers (thin wrappers over lib/server)
components/           app shell, sidebar, charts, sensor card, UI kit (components/ui/kit.tsx)
lib/server/           db.ts (SQLite + migrations), engine.ts (simulator, alerts, MQL), queries.ts, settings.ts
lib/client/           polling hook and JSON helpers
instrumentation.ts    starts the engine when the server boots so history keeps accumulating
types/monitor.ts      types shared by API and UI
```

## Scripts

```bash
npm run dev         # development server
npm run build       # production build
npm start           # run the production build
npm run typecheck   # TypeScript check
```

## Not done yet

- Physical MQL hardware validation and a calibrated nozzle flow.
- Repeatable experimental data, false-alarm rate and alert-latency measurements.
- Any trained fault-detection model (this app only applies fixed thresholds).
- Authentication — the app is meant for a trusted local network.
