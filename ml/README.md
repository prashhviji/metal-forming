# ML fault detection

`train.py` trains eleven models on the labelled readings stored by the app and compares them with the app's existing
fixed-threshold alert rule. Results are written to `results/` and shown on the **ML Models** page of the dashboard.

> **All data here is simulated.** The labels come from the built-in simulator (a reading is `fault = 1` while a simulated fault
> episode is active). The scores show that the pipeline works and how the models compare on that data. They are **not** accuracy
> on a real machine, and should not be presented as such.

## Run it

```bash
python3 -m venv ml/.venv && ml/.venv/bin/pip install -r ml/requirements.txt   # once; tested with Python 3.12
npm run ml:data                                                               # terminal 1: simulator on :3200 -> ml/data
curl -X POST localhost:3200/api/system -H 'Content-Type: application/json' \
  -d '{"action":"reset_data","reseed":true,"hours":48}'                       # terminal 2: 48 h of labelled history
npm run ml:train                                                              # ~15 s
```

`npm run ml:data` writes to `ml/data/cnc-monitor.db`, separate from the dashboard database in `data/`. To train on the
dashboard's own data instead (after *Settings → Delete and regenerate 24 h/48 h*), run
`ml/.venv/bin/python ml/train.py --db data/cnc-monitor.db`. Other flags: `--out`, `--models-dir`, `--fast` (smaller models, smoke test).

## What it does

1. **Data.** Reads `readings` (simulator rows with a fault label) read-only, puts them on an exact 1 s grid.
2. **Features.** 36 causal features per sample, using only the current and earlier readings: for each of vibration, temperature
   and current — raw value, mean and standard deviation over 5 / 15 / 60 s, 15 s max and min, 5 s and 15 s slope, deviation from
   the 60 s mean.
3. **Split.** Chronological 60 / 20 / 20 % (train / validation / test), cut at moments with no fault nearby. The 20 s after a fault ends
   is excluded from training and scoring because temperature is still cooling and the label is ambiguous.
4. **Models.**
   - Supervised: Logistic Regression, Decision Tree, Random Forest, Gradient Boosting, SVM (RBF), k-Nearest Neighbours, MLP.
     Alarm level = the score that maximises F1 on the validation period.
   - Unsupervised, fitted on normal data only: Isolation Forest, One-Class SVM, Local Outlier Factor, Mahalanobis distance.
     Alarm level = 99.5th percentile of normal validation scores, so no fault labels are needed.
   - Baseline: alert when any sensor exceeds its limit (0.3 g, 45 °C, 3.0 A) — what the app does today.
5. **Metrics (test period only).** Precision, recall, F1, ROC-AUC, PR-AUC per sample; per fault episode: caught or not and the delay
   to the first alarm; false alarms per hour of normal operation.
6. **Control.** The same logistic regression trained on shuffled labels must score about 0.5 ROC-AUC; it does (0.48).

Outputs: `results/report.md`, `results/metrics.json`, `results/*.png` (model comparison, ROC / precision–recall, detection timeline,
feature importance) and `models/*.joblib` (git-ignored; each file holds the fitted pipeline, alarm level and feature list).

## Results at the time of writing

Test period: 9.6 h, 95 fault episodes, none used for fitting. Regenerate with `npm run ml:train`; the dashboard always shows the latest run.

| | F1 | Recall | False alarms / h | Episodes caught |
|---|---|---|---|---|
| Fixed-threshold rule | 0.838 | 72.1 % | 0.0 | 95 / 95 |
| Supervised models (7) | 0.988 – 0.992 | 98.7 – 99.7 % | 0.7 – 2.9 | 95 / 95 |
| Unsupervised models (4) | 0.917 – 0.943 | 94.3 – 100 % | 3.9 – 15.3 | 95 / 95 |

## How to present this honestly

- **Say "simulated".** Faults are injected by the simulator and labelled by it, so a model learns the simulator's idea of a fault.
  Near-perfect scores mostly mean simulated faults are easy to separate from simulated normal operation.
- **The existing rule already catches every fault.** Simulated faults are built to cross an alert limit, so 95 / 95 episodes are
  flagged by every approach. The learned models' advantage is coverage (they flag 99 % of fault samples vs 72 %) and speed (alarm at
  the start of the fault instead of about 2 s in), paid for with false alarms the rule does not have.
- **Detection, not prediction.** The simulator has no slow precursor before a fault, so none of this predicts a failure ahead of
  time. That needs real run-to-failure data.
- **F1 depends on where the label boundary is drawn** (here: fault envelope ≥ 20 %). Episode-level and false-alarm figures are less sensitive.
- **Next step for real claims:** log labelled readings from the actual sensor node (normal runs plus deliberately induced, safe
  faults), point `train.py --db` at that database, and report those numbers instead.
