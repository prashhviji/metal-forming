# CNC Monitor — Predictive Maintenance & MQL Lubrication

CIM project (Department of Mechanical Engineering, VIT Chennai): a web dashboard that monitors a CNC machine's
**vibration, temperature and motor current**, raises **threshold alerts**, and runs a **temperature-triggered MQL
(minimum quantity lubrication)** control rule. Everything is stored in a **local SQLite database** — no cloud service.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Chart.js and `better-sqlite3`.

> **Honest status.** Live alerts are fixed-threshold checks. Eleven ML fault-detection models have been trained and
> compared, but only on **simulated** data (see [Machine learning](#machine-learning)); none is validated on the real
> machine, and no accuracy, downtime or tool-life claims are made. Until the sensor node posts real readings, the app runs
> on a built-in **simulator** and says so in the header of every page. See *About* in the app for the validation plan.

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
| **ML Models** | Eleven trained fault-detection models compared with the threshold rule: precision / recall / F1 / false alarms per hour / detection delay, figures, protocol and honest caveats |
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
| `POST /api/system` | `{action:"inject_fault"}` (simulator) or `{action:"reset_data",reseed,hours?}` (`hours` 1–72 of simulated history) |
| `GET /api/ml` · `GET /api/ml/plot/<name>` | Results written by `ml/train.py` (`{available:false}` until it has run) and its PNG figures |

## Machine learning

`ml/train.py` trains and compares fault-detection models on the labelled readings in the database. The simulator marks every
reading `fault = 1` while a simulated fault is active, which gives ground truth to learn from.

| Kind | Models |
|------|--------|
| Supervised (learn from labelled faults) | Logistic Regression, Decision Tree, Random Forest, Gradient Boosting, SVM (RBF), k-Nearest Neighbours, Neural Network (MLP) |
| Unsupervised (learn *normal* only) | Isolation Forest, One-Class SVM, Local Outlier Factor, Mahalanobis distance |
| Baseline | The app's fixed-threshold rule |

Each model sees 36 causal rolling-window features per sample (last 5 / 15 / 60 s of vibration, temperature and current). The data is
split chronologically into train / validation / test; alarm levels are tuned on validation and every number reported is from the
untouched test period. A shuffled-label control confirms the pipeline does not leak.

```bash
python3 -m venv ml/.venv && ml/.venv/bin/pip install -r ml/requirements.txt   # once
npm run ml:data      # separate simulator on :3200 writing to ml/data (your dashboard data is untouched)
curl -X POST localhost:3200/api/system -H 'Content-Type: application/json' -d '{"action":"reset_data","reseed":true,"hours":48}'
npm run ml:train     # ~15 s; writes ml/results/ (report.md, metrics.json, 4 PNG figures) and ml/models/
```

Results appear on the **ML Models** page. Details, protocol and talking points: [`ml/README.md`](ml/README.md).

> **Limits.** Everything is trained and tested on simulated data, so scores show that the pipeline works and how the models compare,
> not accuracy on a real machine. The simulator's faults always cross an alert limit, so the threshold rule already catches every
> fault episode; the learned models mainly cover more of each fault and alarm sooner, at the cost of some false alarms. Re-run
> `train.py` on labelled hardware data before claiming any accuracy.

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
lib/server/           db.ts (SQLite + migrations), engine.ts (simulator, alerts, MQL), queries.ts, settings.ts, ml.ts
lib/client/           polling hook and JSON helpers
ml/                   train.py (model training and comparison), requirements.txt, results/ (report, metrics, figures)
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
- Validation of the ML models on real, labelled machine data (they are trained on simulated data only), and running a model
  inside the live pipeline (live alerts still use fixed thresholds).
- Early failure *prediction* — needs real run-to-failure data; simulated faults have no precursor signal.
- Authentication — the app is meant for a trusted local network.
