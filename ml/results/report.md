# ML model comparison — CNC fault detection

> **Trained and tested on SIMULATED data from the app's built-in simulator. These numbers show that the pipeline works and how the models compare on that data; they are not accuracy on a real machine.**

Generated 2026-10-29 05:13 UTC · scikit-learn 1.9.1 · seed 42

## Data

- Source: `simulator` readings, 1 Hz — 172,862 samples (48.0 h), 465 labelled fault episodes (3.7% of samples).
- Label: fault = 1 while a simulated fault episode is active (the simulator's fault envelope is at least 20% of its peak).
- Features: 36 causal rolling-window features per sample (raw value, mean/std over 5 s, 15 s, 60 s, 15 s max/min, 5 s and 15 s slope, deviation from the 60 s mean) for each of vibration, temperature and current.
- The 20 s after each fault ends is excluded from training and scoring (temperature is still cooling, so the label is ambiguous there).

| Split | Period | Samples | Fault samples | Episodes |
|---|---|---|---|---|
| Train (earliest) | 28.8 h | 103,706 | 3,784 | 278 |
| Validation | 9.6 h | 34,631 | 1,249 | 92 |
| Test (latest, never used for fitting) | 9.6 h | 34,525 | 1,338 | 95 |

Split is chronological, cut at quiet moments with no fault nearby. Supervised alarm levels are tuned on the validation set (max F1). Unsupervised models are fitted on normal data only; their alarm level is the 99.5th percentile of normal validation scores (no fault labels needed).

## Results on the test period

| Model | Type | Precision | Recall | F1 | ROC-AUC | Episodes caught | Median delay | False alarms / h |
|---|---|---|---|---|---|---|---|---|
| Fixed-threshold rule | baseline | 100.0% | 72.1% | 0.838 | 0.995 | 95/95 | 2 s | 0.0 |
| k-Nearest Neighbours | supervised | 99.5% | 98.9% | 0.992 | 1.000 | 95/95 | 0 s | 0.8 |
| Neural Network (MLP) | supervised | 99.0% | 99.3% | 0.991 | 1.000 | 95/95 | 0 s | 1.6 |
| Gradient Boosting | supervised | 99.5% | 98.7% | 0.991 | 1.000 | 95/95 | 0 s | 0.7 |
| Logistic Regression | supervised | 98.9% | 99.3% | 0.991 | 1.000 | 95/95 | 0 s | 1.7 |
| Random Forest | supervised | 99.2% | 98.7% | 0.990 | 1.000 | 95/95 | 0 s | 1.2 |
| SVM (RBF kernel) | supervised | 98.2% | 99.7% | 0.989 | 0.999 | 95/95 | 0 s | 2.9 |
| Decision Tree | supervised | 98.3% | 99.3% | 0.988 | 0.999 | 95/95 | 0 s | 2.4 |
| One-Class SVM | unsupervised | 89.5% | 99.6% | 0.943 | 1.000 | 95/95 | 0 s | 13.0 |
| Local Outlier Factor | unsupervised | 88.2% | 100.0% | 0.937 | 1.000 | 95/95 | 0 s | 15.3 |
| Mahalanobis distance | unsupervised | 88.7% | 98.9% | 0.935 | 1.000 | 95/95 | 0 s | 8.2 |
| Isolation Forest | unsupervised | 89.3% | 94.3% | 0.917 | 0.998 | 95/95 | 1 s | 3.9 |

- *Precision / recall / F1* are per sample. *Episodes caught* = fault episodes flagged at least once while active. *Median delay* = seconds from the start of the labelled fault to the first alarm. *False alarms / h* counts alarm bursts in fault-free operation (bursts closer than 10 s are merged).
- Models are ranked within their family by validation PR-AUC; the "best" picks below never look at the test set.
- Best supervised: **Logistic Regression** · best unsupervised: **Local Outlier Factor**.

## What drives the best tree model

| Feature | Importance |
|---|---|
| `vibration` | 0.185 |
| `vibration_max15` | 0.171 |
| `current_max15` | 0.089 |
| `vibration_std15` | 0.087 |
| `current_std15` | 0.080 |
| `vibration_mean5` | 0.074 |
| `current` | 0.065 |
| `temperature_std5` | 0.063 |
| `vibration_dev60` | 0.047 |
| `temperature_dev60` | 0.037 |

## How to read this honestly

- All data is simulated. Faults are injected by the simulator and labelled by it, so the models learn the simulator's idea of a fault.
- The fixed-threshold rule already flags 95/95 test fault episodes, because simulated faults are built to push a sensor over its limit. Learned models mainly differ in how early they alarm, how many fault samples they cover and how many false alarms they raise — not in whether a fault is noticed at all.
- The simulator has no slow precursor before a fault, so this is fault *detection*, not early *prediction*. Predicting a failure ahead of time needs real run-to-failure data.
- Sample-level scores depend on how the label boundary is drawn (here: envelope >= 20%). Treat F1 as indicative; episode and false-alarm figures are less sensitive.
- Negative control: the same logistic regression trained on shuffled labels reaches test ROC-AUC 0.48 (chance = 0.50), so the high scores of the real models come from the sensor patterns, not from a leak in the pipeline. Near-perfect scores mainly show that simulated faults are easy to separate from simulated normal operation.
- Real machines add sensor noise, load changes and drift that the simulator does not have. Re-run this script on labelled data from the hardware before claiming any accuracy.

## Reproduce

```bash
ml/.venv/bin/python ml/train.py
```

Plots: `model_comparison.png`, `roc_pr.png`, `detection_timeline.png`, `feature_importance.png`. Trained models are saved to `ml/models/` (git-ignored).
