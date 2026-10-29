#!/usr/bin/env python3
"""Train and compare fault-detection models on the CNC monitor's labelled readings.

Reads the SQLite database written by the app (read-only), builds causal rolling-window features from the
three sensors (vibration, temperature, motor current), trains supervised and unsupervised models, and compares
them with the app's existing fixed-threshold rule on a held-out, chronologically later test period.

IMPORTANT: the labels come from the built-in simulator (fault = 1 while a simulated fault episode is active),
so every number produced here describes the simulator's data, not a real machine. Results are tagged that way
in metrics.json and report.md.

    ml/.venv/bin/python ml/train.py              # defaults: ml/data/cnc-monitor.db -> ml/results, ml/models
    ml/.venv/bin/python ml/train.py --fast       # smaller models, quick smoke test
"""
from __future__ import annotations

import argparse
import json
import platform
import sqlite3
import time
import warnings
from datetime import datetime, timezone
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import sklearn  # noqa: E402
from sklearn.covariance import LedoitWolf  # noqa: E402
from sklearn.ensemble import HistGradientBoostingClassifier, IsolationForest, RandomForestClassifier  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import average_precision_score, precision_recall_curve, roc_auc_score, roc_curve  # noqa: E402
from sklearn.neighbors import KNeighborsClassifier, LocalOutlierFactor  # noqa: E402
from sklearn.neural_network import MLPClassifier  # noqa: E402
from sklearn.pipeline import make_pipeline  # noqa: E402
from sklearn.preprocessing import StandardScaler  # noqa: E402
from sklearn.svm import SVC, OneClassSVM  # noqa: E402
from sklearn.tree import DecisionTreeClassifier  # noqa: E402

HERE = Path(__file__).resolve().parent
SEED = 42
SENSORS = ["vibration", "temperature", "current"]
# Same defaults as DEFAULT_SETTINGS.thresholds in lib/server/settings.ts (the app's fixed-threshold alert rule).
LIMITS = {"vibration": 0.3, "temperature": 45.0, "current": 3.0}
WINDOWS = (5, 15, 60)          # seconds of history used by the rolling features (samples are 1 Hz)
RECOVERY_TAIL_S = 20           # after a fault ends the thermal lag keeps readings elevated: not scored, not trained on
SPLIT_FRACTIONS = (0.6, 0.8)   # chronological train | validation | test
SNAP_S = 80                    # split points are moved to a spot with no fault within +/- this many seconds
EVENT_MERGE_S = 10             # alarm samples closer than this count as one alarm event
UNSUP_ALARM_QUANTILE = 0.995   # unsupervised alarm level: 99.5th percentile of normal validation scores

FAMILY_COLOR = {"supervised": "#2a78d6", "unsupervised": "#eb6834", "baseline": "#898781"}
INK, INK2, MUTED, GRID, SURFACE = "#0b0b0b", "#52514e", "#898781", "#e1e0d9", "#fcfcfb"

DISCLAIMER = (
    "Trained and tested on SIMULATED data from the app's built-in simulator. These numbers show that the "
    "pipeline works and how the models compare on that data; they are not accuracy on a real machine."
)


# --------------------------------------------------------------------------------------------- data

def load_readings(db: Path) -> pd.DataFrame:
    if not db.exists():
        raise SystemExit(f"Database not found: {db}\nGenerate labelled data first (see ml/README.md).")
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    try:
        df = pd.read_sql_query(
            'SELECT ts, vibration, temperature, "current" AS current, fault FROM readings '
            "WHERE source = 'simulator' AND fault IS NOT NULL ORDER BY ts",
            con,
        )
    finally:
        con.close()
    if len(df) < 20_000:
        raise SystemExit(f"Only {len(df)} labelled readings in {db}; need at least ~6 hours (20,000) to train.")
    return df


def to_regular_grid(df: pd.DataFrame) -> pd.DataFrame:
    """Put the readings on an exact 1 s grid; short gaps (<= 5 s) are interpolated, longer ones stay NaN."""
    t = ((df["ts"] - df["ts"].iloc[0]) / 1000).round().astype(int)
    df = df.assign(t=t).drop_duplicates("t").set_index("t")
    full = df.reindex(np.arange(0, int(t.max()) + 1))
    full[SENSORS] = full[SENSORS].interpolate(limit=5, limit_area="inside")
    full["fault"] = full["fault"].ffill(limit=5)
    return full[SENSORS + ["fault"]]


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Causal features: each row only uses the current and earlier samples."""
    cols: dict[str, pd.Series] = {}
    for c in SENSORS:
        x = df[c]
        cols[c] = x
        for w in WINDOWS:
            r = x.rolling(w)
            cols[f"{c}_mean{w}"] = r.mean()
            cols[f"{c}_std{w}"] = r.std()
        cols[f"{c}_max15"] = x.rolling(15).max()
        cols[f"{c}_min15"] = x.rolling(15).min()
        cols[f"{c}_slope5"] = (x - x.shift(5)) / 5
        cols[f"{c}_slope15"] = (x - x.shift(15)) / 15
        cols[f"{c}_dev60"] = x - cols[f"{c}_mean60"]
    return pd.DataFrame(cols)


def runs(b: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Start and (inclusive) end index of each run of True."""
    d = np.diff(np.r_[0, b.astype(np.int8), 0])
    return np.flatnonzero(d == 1), np.flatnonzero(d == -1) - 1


# ------------------------------------------------------------------------------------- evaluation

def evaluate(y, score, pred, eval_mask, lo, hi) -> dict:
    """Sample-level and episode-level metrics on rows [lo, hi). Ignored rows (recovery tail, warm-up) are skipped."""
    m = eval_mask[lo:hi]
    y_p = y[lo:hi]
    pos = pred[lo:hi] & m
    yt, st, pt = y_p[m], score[lo:hi][m], pred[lo:hi][m]

    tp = int((pt & (yt == 1)).sum())
    fp = int((pt & (yt == 0)).sum())
    fn = int((~pt & (yt == 1)).sum())
    tn = int((~pt & (yt == 0)).sum())
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0

    # alarm events outside faults -> false alarms per hour of normal operation
    fp_idx = np.flatnonzero(pos & (y_p == 0))
    fa_events = 0 if fp_idx.size == 0 else 1 + int((np.diff(fp_idx) > EVENT_MERGE_S).sum())
    normal_hours = float((m & (y_p == 0)).sum()) / 3600

    # episode-level: was each fault episode flagged at least once while it was active, and how fast?
    starts, ends = runs(y_p == 1)
    delays = []
    for s, e in zip(starts, ends):
        hit = np.flatnonzero(pos[s : e + 1])
        if hit.size:
            delays.append(int(hit[0]))
    n_ep = int(starts.size)

    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "roc_auc": float(roc_auc_score(yt, st)),
        "pr_auc": float(average_precision_score(yt, st)),
        "false_alarm_events": fa_events,
        "false_alarms_per_hour": fa_events / normal_hours if normal_hours else 0.0,
        "episodes": n_ep,
        "episodes_detected": len(delays),
        "episode_recall": len(delays) / n_ep if n_ep else 0.0,
        "delay_median_s": float(np.median(delays)) if delays else None,
        "delay_p90_s": float(np.percentile(delays, 90)) if delays else None,
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
    }


def thin_roc(y, s) -> dict:
    fpr, tpr, _ = roc_curve(y, s)
    grid = np.unique(np.r_[0.0, np.geomspace(1e-4, 1.0, 70)])
    return {"fpr": grid.round(5).tolist(), "tpr": np.interp(grid, fpr, tpr).round(4).tolist()}


def best_f1_threshold(y, s) -> float:
    p, r, th = precision_recall_curve(y, s)
    f1 = 2 * p[:-1] * r[:-1] / np.maximum(p[:-1] + r[:-1], 1e-12)
    return float(th[int(np.argmax(f1))])


def subsample(idx, y, cap, rng, pos_frac=0.25):
    """Cap the training size for the O(n^2)-ish models, keeping a useful share of fault samples."""
    if idx.size <= cap:
        return idx
    pos, neg = idx[y[idx] == 1], idx[y[idx] == 0]
    n_pos = min(pos.size, int(cap * pos_frac))
    n_neg = min(neg.size, cap - n_pos)
    return np.sort(np.r_[rng.choice(pos, n_pos, replace=False), rng.choice(neg, n_neg, replace=False)])


def sup_score(pipe, X):
    return pipe.predict_proba(X)[:, 1] if hasattr(pipe, "predict_proba") else pipe.decision_function(X)


def unsup_score(pipe, X):
    final, Xs = pipe[-1], pipe[:-1].transform(X)
    return final.mahalanobis(Xs) if isinstance(final, LedoitWolf) else -final.score_samples(Xs)


def supervised_specs(fast: bool):
    trees = 60 if fast else 200
    return [
        dict(slug="logistic_regression", name="Logistic Regression", cap=None,
             blurb="Linear model; the simplest learned baseline.",
             make=lambda: LogisticRegression(max_iter=3000, class_weight="balanced")),
        dict(slug="decision_tree", name="Decision Tree", cap=None,
             blurb="Depth-6 tree; readable if/else rules.",
             make=lambda: DecisionTreeClassifier(max_depth=6, min_samples_leaf=20, class_weight="balanced", random_state=SEED)),
        dict(slug="random_forest", name="Random Forest", cap=None,
             blurb=f"{trees} bagged trees; robust and gives feature importance.",
             make=lambda: RandomForestClassifier(n_estimators=trees, min_samples_leaf=5, class_weight="balanced_subsample",
                                                 n_jobs=-1, random_state=SEED)),
        dict(slug="gradient_boosting", name="Gradient Boosting", cap=None,
             blurb="Histogram gradient-boosted trees.",
             make=lambda: HistGradientBoostingClassifier(max_iter=60 if fast else 150, learning_rate=0.08,
                                                         early_stopping=False, class_weight="balanced", random_state=SEED)),
        dict(slug="svm_rbf", name="SVM (RBF kernel)", cap=6_000 if fast else 20_000,
             blurb="Kernel SVM on a balanced subsample (cost grows quickly with data).",
             make=lambda: SVC(kernel="rbf", C=2.0, gamma="scale", class_weight="balanced")),
        dict(slug="knn", name="k-Nearest Neighbours", cap=10_000 if fast else 40_000,
             blurb="Votes of the 15 closest training samples, on a subsample.",
             make=lambda: KNeighborsClassifier(n_neighbors=15, weights="distance", n_jobs=-1)),
        dict(slug="mlp", name="Neural Network (MLP)", cap=None,
             blurb="Two hidden layers (64, 32).",
             make=lambda: MLPClassifier(hidden_layer_sizes=(64, 32), early_stopping=True, max_iter=200, random_state=SEED)),
    ]


def unsupervised_specs(fast: bool):
    return [
        dict(slug="isolation_forest", name="Isolation Forest", cap=30_000 if fast else None,
             blurb="Learns what normal looks like; flags samples that are easy to isolate.",
             make=lambda: IsolationForest(n_estimators=100 if fast else 200, random_state=SEED, n_jobs=-1)),
        dict(slug="one_class_svm", name="One-Class SVM", cap=3_000 if fast else 8_000,
             blurb="Boundary around normal data in kernel space (normal subsample).",
             make=lambda: OneClassSVM(nu=0.01, gamma="scale")),
        dict(slug="lof", name="Local Outlier Factor", cap=5_000 if fast else 15_000,
             blurb="Compares local density with that of the nearest normal samples.",
             make=lambda: LocalOutlierFactor(n_neighbors=35, novelty=True, n_jobs=-1)),
        dict(slug="mahalanobis", name="Mahalanobis distance", cap=None,
             blurb="Distance from the normal operating cloud (Gaussian model).",
             make=lambda: LedoitWolf()),
    ]


# ----------------------------------------------------------------------------------------- plots

def style_axes(ax, grid_axis="y"):
    ax.set_facecolor(SURFACE)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color("#c3c2b7")
    ax.tick_params(colors=MUTED, labelsize=9, length=3)
    ax.grid(axis=grid_axis, color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)


def new_fig(w, h):
    fig = plt.figure(figsize=(w, h), facecolor=SURFACE, dpi=160)
    plt.rcParams["font.family"] = ["Helvetica Neue", "Arial", "DejaVu Sans"]
    return fig


def plot_comparison(rows, path):
    rows = sorted(rows, key=lambda r: r["metrics"]["f1"])
    panels = [
        ("F1 score", lambda r: r["metrics"]["f1"], "{:.3f}", (0, 1.08)),
        ("False alarms per hour", lambda r: r["metrics"]["false_alarms_per_hour"], "{:.1f}", None),
        ("Recall (share of fault samples flagged)", lambda r: r["metrics"]["recall"], "{:.2f}", (0, 1.12)),
    ]
    fig = new_fig(14, 0.55 * len(rows) + 2.2)
    axes = fig.subplots(1, 3, sharey=True)
    for ax, (title, fn, fmt, xlim) in zip(axes, panels):
        style_axes(ax, "x")
        vals = [fn(r) for r in rows]
        ax.barh(range(len(rows)), vals, color=[FAMILY_COLOR[r["family"]] for r in rows], height=0.62)
        top = max(vals) if max(vals) > 0 else 1
        for i, v in enumerate(vals):
            ax.text(v + top * 0.015, i, fmt.format(v), va="center", fontsize=9, color=INK2)
        ax.set_title(title, loc="left", fontsize=11, color=INK, pad=10)
        ax.set_xlim(*(xlim or (0, top * 1.18)))
        ax.set_yticks(range(len(rows)), [r["name"] for r in rows], color=INK2, fontsize=10)
    handles = [plt.Rectangle((0, 0), 1, 1, color=FAMILY_COLOR[k]) for k in ("supervised", "unsupervised", "baseline")]
    fig.legend(handles, ["Supervised (labelled faults)", "Unsupervised (normal data only)", "Fixed-threshold rule (current app)"],
               loc="lower center", ncol=3, frameon=False, fontsize=10, labelcolor=INK2)
    fig.suptitle("Held-out test period — trained on SIMULATED data", x=0.01, ha="left", fontsize=13, color=INK, y=0.99)
    fig.tight_layout(rect=(0, 0.06, 1, 0.95))
    fig.savefig(path, facecolor=SURFACE)
    plt.close(fig)


def plot_roc_pr(curves, path):
    """curves: list of (label, color, y_true, scores)."""
    fig = new_fig(11, 4.6)
    ax1, ax2 = fig.subplots(1, 2)
    for ax in (ax1, ax2):
        style_axes(ax, "both")
    # Near-perfect curves hug the top edge, so both axes are zoomed; the later (orange) curve is thinner so overlaps stay visible.
    for k, (label, color, y, s) in enumerate(curves):
        lw = (2.2, 3.4, 1.6)[k % 3]
        fpr, tpr, _ = roc_curve(y, s)
        ax1.plot(np.maximum(fpr, 1e-4), tpr, color=color, lw=lw, label=label, zorder=3 + k)
        p, r, _ = precision_recall_curve(y, s)
        ax2.plot(r, p, color=color, lw=lw, label=label, zorder=3 + k)
    ax1.set_xscale("log")
    ax1.set_xlim(1e-4, 1)
    ax1.set_ylim(0.9, 1.004)
    ax1.set_xlabel("False positive rate (log scale)", color=INK2, fontsize=10)
    ax1.set_ylabel("True positive rate", color=INK2, fontsize=10)
    ax1.set_title("ROC (zoomed to 0.90–1.00)", loc="left", fontsize=11, color=INK)
    ax2.set_xlim(0.9, 1.002)
    ax2.set_ylim(0.4, 1.01)
    ax2.set_xlabel("Recall", color=INK2, fontsize=10)
    ax2.set_ylabel("Precision", color=INK2, fontsize=10)
    ax2.set_title("Precision–recall (zoomed)", loc="left", fontsize=11, color=INK)
    ax2.legend(loc="lower left", frameon=False, fontsize=9, labelcolor=INK2)
    fig.suptitle("Test period — SIMULATED data", x=0.01, ha="left", fontsize=12, color=INK)
    fig.tight_layout(rect=(0, 0, 1, 0.94))
    fig.savefig(path, facecolor=SURFACE)
    plt.close(fig)


def plot_importance(items, path):
    items = items[:12][::-1]
    fig = new_fig(8, 0.4 * len(items) + 1.6)
    ax = fig.subplots()
    style_axes(ax, "x")
    vals = [i["importance"] for i in items]
    ax.barh(range(len(items)), vals, color=FAMILY_COLOR["supervised"], height=0.62)
    for i, v in enumerate(vals):
        ax.text(v + max(vals) * 0.015, i, f"{v:.3f}", va="center", fontsize=9, color=INK2)
    ax.set_yticks(range(len(items)), [i["feature"] for i in items], color=INK2, fontsize=10)
    ax.set_xlim(0, max(vals) * 1.15)
    ax.set_title("Random Forest — top features (impurity importance)", loc="left", fontsize=11, color=INK, pad=10)
    fig.tight_layout()
    fig.savefig(path, facecolor=SURFACE)
    plt.close(fig)


def plot_timeline(frame, y, pred_model, pred_base, lo, hi, model_name, path):
    """A few minutes of the test period: sensors, labelled faults, and when each detector raised an alarm."""
    t = np.arange(hi - lo)
    fig = new_fig(12, 8)
    gs = fig.add_gridspec(4, 1, height_ratios=[3, 3, 3, 1.4], hspace=0.35)
    axes = [fig.add_subplot(gs[i]) for i in range(4)]
    titles = {"vibration": "Vibration (g)", "temperature": "Temperature (°C)", "current": "Motor current (A)"}
    starts, ends = runs(y[lo:hi] == 1)
    for ax, c in zip(axes[:3], SENSORS):
        style_axes(ax, "y")
        for s, e in zip(starts, ends):
            ax.axvspan(s, e + 1, color="#e34948", alpha=0.14, lw=0)
        ax.plot(t, frame[c].values[lo:hi], color=FAMILY_COLOR["supervised"], lw=1.4)
        ax.axhline(LIMITS[c], color=MUTED, lw=1, ls=(0, (4, 3)))
        ax.text(t[-1], LIMITS[c], " alert limit", va="bottom", ha="right", fontsize=8, color=MUTED)
        ax.set_title(titles[c], loc="left", fontsize=10, color=INK2, pad=4)
        ax.set_xticklabels([])
    strip = axes[3]
    style_axes(strip, "x")
    for row, (name, pred, color) in enumerate([("Fixed threshold", pred_base, FAMILY_COLOR["baseline"]), (model_name, pred_model, FAMILY_COLOR["supervised"])]):
        idx = np.flatnonzero(pred[lo:hi])
        strip.vlines(idx, row + 0.1, row + 0.9, color=color, lw=1.6)
    for s, e in zip(starts, ends):
        strip.axvspan(s, e + 1, color="#e34948", alpha=0.14, lw=0)
    strip.set_ylim(0, 2)
    strip.set_yticks([0.5, 1.5], ["Fixed threshold", model_name], color=INK2, fontsize=9)
    strip.set_xlim(0, hi - lo)
    strip.set_xlabel("Seconds into window", color=INK2, fontsize=10)
    for ax in axes[:3]:
        ax.set_xlim(0, hi - lo)
    fig.legend([plt.Rectangle((0, 0), 1, 1, color="#e34948", alpha=0.3)], ["Labelled fault (simulator ground truth)"],
               loc="upper right", frameon=False, fontsize=9, labelcolor=INK2)
    fig.suptitle("Test-period excerpt — SIMULATED data", x=0.01, ha="left", fontsize=12, color=INK)
    fig.subplots_adjust(left=0.13, right=0.98, top=0.90, bottom=0.07)
    fig.savefig(path, facecolor=SURFACE)
    plt.close(fig)


# ------------------------------------------------------------------------------------------ report

def fmt_pct(x):
    return f"{x * 100:.1f}%"


def write_report(path: Path, meta: dict, rows: list[dict], importance: list[dict]):
    d, sp = meta["dataset"], meta["splits"]
    order = sorted(rows, key=lambda r: (r["family"] != "baseline", r["family"], -r["metrics"]["f1"]))
    L = [
        "# ML model comparison — CNC fault detection",
        "",
        f"> **{DISCLAIMER}**",
        "",
        f"Generated {meta['generated_at']} · scikit-learn {meta['versions']['scikit-learn']} · seed {SEED}",
        "",
        "## Data",
        "",
        f"- Source: `{d['source']}` readings, 1 Hz — {d['samples']:,} samples ({d['hours']:.1f} h), "
        f"{d['episodes']} labelled fault episodes ({fmt_pct(d['fault_rate'])} of samples).",
        f"- Label: {d['label_definition']}",
        f"- Features: {d['n_features']} causal rolling-window features per sample "
        f"(raw value, mean/std over {', '.join(str(w) + ' s' for w in WINDOWS)}, 15 s max/min, 5 s and 15 s slope, deviation from the 60 s mean) "
        "for each of vibration, temperature and current.",
        f"- The {RECOVERY_TAIL_S} s after each fault ends is excluded from training and scoring "
        "(temperature is still cooling, so the label is ambiguous there).",
        "",
        "| Split | Period | Samples | Fault samples | Episodes |",
        "|---|---|---|---|---|",
    ]
    for k, label in (("train", "Train (earliest)"), ("val", "Validation"), ("test", "Test (latest, never used for fitting)")):
        s = sp[k]
        L.append(f"| {label} | {s['hours']:.1f} h | {s['samples']:,} | {s['fault_samples']:,} | {s['episodes']} |")
    L += [
        "",
        "Split is chronological, cut at quiet moments with no fault nearby. Supervised alarm levels are tuned on the validation "
        f"set (max F1). Unsupervised models are fitted on normal data only; their alarm level is the {UNSUP_ALARM_QUANTILE * 100:.1f}th "
        "percentile of normal validation scores (no fault labels needed).",
        "",
        "## Results on the test period",
        "",
        "| Model | Type | Precision | Recall | F1 | ROC-AUC | Episodes caught | Median delay | False alarms / h |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for r in order:
        m = r["metrics"]
        delay = "—" if m["delay_median_s"] is None else f"{m['delay_median_s']:.0f} s"
        L.append(
            f"| {r['name']} | {r['family']} | {fmt_pct(m['precision'])} | {fmt_pct(m['recall'])} | {m['f1']:.3f} | {m['roc_auc']:.3f} | "
            f"{m['episodes_detected']}/{m['episodes']} | {delay} | {m['false_alarms_per_hour']:.1f} |"
        )
    L += [
        "",
        "- *Precision / recall / F1* are per sample. *Episodes caught* = fault episodes flagged at least once while active. "
        "*Median delay* = seconds from the start of the labelled fault to the first alarm. "
        "*False alarms / h* counts alarm bursts in fault-free operation (bursts closer than "
        f"{EVENT_MERGE_S} s are merged).",
        "- Rows are sorted by F1 within each family. The \"best\" picks below are made by validation PR-AUC and never look at the test set.",
        f"- Best supervised: **{meta['best']['supervised_name']}** · best unsupervised: **{meta['best']['unsupervised_name']}**.",
        "",
        "## What drives the Random Forest",
        "",
        "| Feature | Importance |",
        "|---|---|",
    ]
    L += [f"| `{i['feature']}` | {i['importance']:.3f} |" for i in importance[:10]]
    L += ["", "## How to read this honestly", ""]
    L += [f"- {n}" for n in meta["notes"]]
    L += [
        "",
        "## Reproduce",
        "",
        "```bash",
        "ml/.venv/bin/python ml/train.py",
        "```",
        "",
        "Plots: `model_comparison.png`, `roc_pr.png`, `detection_timeline.png`, `feature_importance.png`. "
        "Trained models are saved to `ml/models/` (git-ignored).",
        "",
    ]
    path.write_text("\n".join(L))


# -------------------------------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", type=Path, default=HERE / "data" / "cnc-monitor.db")
    ap.add_argument("--out", type=Path, default=HERE / "results")
    ap.add_argument("--models-dir", type=Path, default=HERE / "models")
    ap.add_argument("--fast", action="store_true", help="smaller models and subsamples (smoke test)")
    args = ap.parse_args()
    warnings.filterwarnings("ignore", category=UserWarning)
    rng = np.random.default_rng(SEED)
    args.out.mkdir(parents=True, exist_ok=True)
    args.models_dir.mkdir(parents=True, exist_ok=True)

    # ---- data ----
    print(f"Loading {args.db} …")
    raw = load_readings(args.db)
    frame = to_regular_grid(raw)
    y = frame["fault"].fillna(0).astype(int).to_numpy()
    n = len(frame)
    feats = build_features(frame)
    feat_names = list(feats.columns)
    X = feats.to_numpy()
    feat_ok = ~np.isnan(X).any(axis=1) & frame["fault"].notna().to_numpy()
    tail = (pd.Series(y).rolling(RECOVERY_TAIL_S + 1, min_periods=1).max().to_numpy() == 1) & (y == 0)
    eval_mask = feat_ok & ~tail

    quiet = pd.Series(y).rolling(2 * SNAP_S + 1, center=True, min_periods=1).max().to_numpy() == 0

    def snap(b: int) -> int:
        for off in range(n):
            for i in (b + off, b - off):
                if 0 < i < n and quiet[i]:
                    return i
        raise SystemExit("Could not find a quiet split point")

    b1, b2 = snap(int(n * SPLIT_FRACTIONS[0])), snap(int(n * SPLIT_FRACTIONS[1]))
    parts = {"train": (0, b1), "val": (b1, b2), "test": (b2, n)}

    splits = {}
    for k, (lo, hi) in parts.items():
        starts, _ = runs(y[lo:hi] == 1)
        splits[k] = {"samples": int(hi - lo), "hours": (hi - lo) / 3600, "fault_samples": int(y[lo:hi].sum()), "episodes": int(starts.size)}
        print(f"  {k:5s} {hi - lo:>7,} samples  {splits[k]['fault_samples']:>5,} fault  {starts.size:>3} episodes")

    starts_all, _ = runs(y == 1)
    dataset = {
        "source": "simulator",
        "samples": int(n),
        "hours": n / 3600,
        "sample_rate_hz": 1,
        "fault_samples": int(y.sum()),
        "fault_rate": float(y.mean()),
        "episodes": int(starts_all.size),
        "n_features": len(feat_names),
        "features": feat_names,
        "recovery_tail_s": RECOVERY_TAIL_S,
        "label_definition": "fault = 1 while a simulated fault episode is active (the simulator's fault envelope is at least 20% of its peak).",
    }

    tr_idx = np.flatnonzero(eval_mask[: parts["train"][1]])
    normal_tr = tr_idx[y[tr_idx] == 0]
    lo_v, hi_v = parts["val"]
    lo_t, hi_t = parts["test"]
    val_idx = np.arange(lo_v, hi_v)[feat_ok[lo_v:hi_v]]
    test_idx = np.arange(lo_t, hi_t)[feat_ok[lo_t:hi_t]]

    rows: list[dict] = []
    scores_val: dict[str, np.ndarray] = {}
    scores_test: dict[str, np.ndarray] = {}
    preds_test: dict[str, np.ndarray] = {}
    pipes: dict[str, object] = {}

    # ---- baseline: the app's fixed-threshold rule ----
    ratio = np.max(np.stack([frame[c].to_numpy() / LIMITS[c] for c in SENSORS]), axis=0)  # >1 means some limit is breached
    ratio = np.nan_to_num(ratio, nan=0.0)
    base_pred = ratio > 1.0
    rows.append({
        "slug": "threshold_rule", "name": "Fixed-threshold rule", "family": "baseline",
        "blurb": "Current app behaviour: alert when vibration > 0.3 g, temperature > 45 °C or current > 3.0 A.",
        "threshold": "1.0 × alert limit", "fit_seconds": 0.0, "n_fit_samples": 0, "predict_ms_per_1k": 0.0,
        "val": evaluate(y, ratio, base_pred, eval_mask, lo_v, hi_v),
        "metrics": evaluate(y, ratio, base_pred, eval_mask, lo_t, hi_t),
        "roc": thin_roc(y[test_idx][eval_mask[test_idx]], ratio[test_idx][eval_mask[test_idx]]),
    })
    scores_val["threshold_rule"], scores_test["threshold_rule"], preds_test["threshold_rule"] = ratio, ratio, base_pred

    def run_model(spec: dict, family: str):
        t0 = time.perf_counter()
        if family == "supervised":
            fit_idx = subsample(tr_idx, y, spec["cap"], rng) if spec["cap"] else tr_idx
            pipe = make_pipeline(StandardScaler(), spec["make"]()).fit(X[fit_idx], y[fit_idx])
            scorer = sup_score
        else:
            fit_idx = rng.choice(normal_tr, min(spec["cap"], normal_tr.size), replace=False) if spec["cap"] else normal_tr
            pipe = make_pipeline(StandardScaler(), spec["make"]()).fit(X[fit_idx])
            scorer = unsup_score
        fit_s = time.perf_counter() - t0

        t0 = time.perf_counter()
        sv = np.full(n, np.nan)
        st = np.full(n, np.nan)
        sv[val_idx] = scorer(pipe, X[val_idx])
        st[test_idx] = scorer(pipe, X[test_idx])
        pred_ms = (time.perf_counter() - t0) / (val_idx.size + test_idx.size) * 1e6

        vm = eval_mask[lo_v:hi_v]
        yv, sv_m = y[lo_v:hi_v][vm], sv[lo_v:hi_v][vm]
        if family == "supervised":
            thr = best_f1_threshold(yv, sv_m)
            rule = "alarm level that maximises F1 on the validation set"
        else:
            thr = float(np.quantile(sv_m[yv == 0], UNSUP_ALARM_QUANTILE))
            rule = f"{UNSUP_ALARM_QUANTILE * 100:.1f}th percentile of normal validation scores"
        sv0, st0 = np.nan_to_num(sv, nan=-1e9), np.nan_to_num(st, nan=-1e9)
        pv, pt = sv0 >= thr, st0 >= thr
        tm = eval_mask[lo_t:hi_t]
        row = {
            "slug": spec["slug"], "name": spec["name"], "family": family, "blurb": spec["blurb"],
            "threshold": rule, "fit_seconds": fit_s, "n_fit_samples": int(fit_idx.size), "predict_ms_per_1k": pred_ms,
            "val": evaluate(y, sv0, pv, eval_mask, lo_v, hi_v),
            "metrics": evaluate(y, st0, pt, eval_mask, lo_t, hi_t),
            "roc": thin_roc(y[lo_t:hi_t][tm], st0[lo_t:hi_t][tm]),
        }
        rows.append(row)
        scores_val[spec["slug"]], scores_test[spec["slug"]], preds_test[spec["slug"]] = sv0, st0, pt
        pipes[spec["slug"]] = (pipe, thr)
        m = row["metrics"]
        print(f"  {spec['name']:<24} fit {fit_s:5.1f}s  F1 {m['f1']:.3f}  AUC {m['roc_auc']:.3f}  "
              f"episodes {m['episodes_detected']}/{m['episodes']}  FA/h {m['false_alarms_per_hour']:.1f}")

    print("Supervised models …")
    for spec in supervised_specs(args.fast):
        run_model(spec, "supervised")
    print("Unsupervised models (normal data only) …")
    for spec in unsupervised_specs(args.fast):
        run_model(spec, "unsupervised")
    b = rows[0]["metrics"]
    print(f"  {'Fixed-threshold rule':<24} F1 {b['f1']:.3f}  AUC {b['roc_auc']:.3f}  episodes {b['episodes_detected']}/{b['episodes']}  FA/h {b['false_alarms_per_hour']:.1f}")

    # ---- pick "best" per family by validation PR-AUC (never by test) ----
    best = {}
    for fam in ("supervised", "unsupervised"):
        best[fam] = max((r for r in rows if r["family"] == fam), key=lambda r: r["val"]["pr_auc"])
    best_meta = {
        "supervised": best["supervised"]["slug"], "supervised_name": best["supervised"]["name"],
        "unsupervised": best["unsupervised"]["slug"], "unsupervised_name": best["unsupervised"]["name"],
    }
    print(f"Best by validation PR-AUC: {best_meta['supervised_name']} / {best_meta['unsupervised_name']}")

    # ---- feature importance (Random Forest) ----
    rf = pipes["random_forest"][0][-1]
    importance = sorted(
        ({"feature": f, "importance": float(v)} for f, v in zip(feat_names, rf.feature_importances_)),
        key=lambda d: -d["importance"],
    )

    # ---- negative control: same pipeline, shuffled training labels -> should score at chance ----
    ty = y[test_idx][eval_mask[test_idx]]
    shuffled = make_pipeline(StandardScaler(), LogisticRegression(max_iter=3000, class_weight="balanced"))
    shuffled.fit(X[tr_idx], rng.permutation(y[tr_idx]))
    control_auc = float(roc_auc_score(ty, sup_score(shuffled, X[test_idx][eval_mask[test_idx]])))
    print(f"Label-shuffle control (logistic regression): test ROC-AUC {control_auc:.3f} (chance = 0.5)")

    # ---- notes (computed facts first, so the caveats match the numbers) ----
    base_m = rows[0]["metrics"]
    notes = [
        "All data is simulated. Faults are injected by the simulator and labelled by it, so the models learn the simulator's idea of a fault.",
        f"The fixed-threshold rule already flags {base_m['episodes_detected']}/{base_m['episodes']} test fault episodes, because simulated faults are "
        "built to push a sensor over its limit. Learned models mainly differ in how early they alarm, how many fault samples they cover "
        "and how many false alarms they raise — not in whether a fault is noticed at all.",
        "The simulator has no slow precursor before a fault, so this is fault *detection*, not early *prediction*. Predicting a failure "
        "ahead of time needs real run-to-failure data.",
        "Sample-level scores depend on how the label boundary is drawn (here: envelope >= 20%). Treat F1 as indicative; episode and false-alarm figures are less sensitive.",
        f"Negative control: the same logistic regression trained on shuffled labels reaches test ROC-AUC {control_auc:.2f} (chance = 0.50), "
        "so the high scores of the real models come from the sensor patterns, not from a leak in the pipeline. "
        "Near-perfect scores mainly show that simulated faults are easy to separate from simulated normal operation.",
        "Real machines add sensor noise, load changes and drift that the simulator does not have. Re-run this script on labelled data from the "
        "hardware before claiming any accuracy.",
    ]
    meta = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "disclaimer": DISCLAIMER,
        "versions": {"python": platform.python_version(), "scikit-learn": sklearn.__version__, "numpy": np.__version__, "pandas": pd.__version__},
        "seed": SEED,
        "fast_mode": bool(args.fast),
        "dataset": dataset,
        "splits": splits,
        "protocol": {
            "windows_s": list(WINDOWS), "recovery_tail_s": RECOVERY_TAIL_S, "event_merge_s": EVENT_MERGE_S,
            "limits": LIMITS, "unsupervised_alarm_quantile": UNSUP_ALARM_QUANTILE,
        },
        "best": best_meta,
        "controls": {"label_shuffle_roc_auc": control_auc},
        "notes": notes,
    }

    # ---- save outputs ----
    def rnd(o):
        if isinstance(o, float):
            return round(o, 5)
        if isinstance(o, dict):
            return {k: rnd(v) for k, v in o.items()}
        if isinstance(o, list):
            return [rnd(v) for v in o]
        return o

    (args.out / "metrics.json").write_text(json.dumps(rnd({**meta, "models": rows, "feature_importance": importance[:20]}), indent=2))
    write_report(args.out / "report.md", meta, rows, importance)

    for slug, (pipe, thr) in pipes.items():
        joblib.dump({"pipeline": pipe, "threshold": thr, "features": feat_names, "trained_on": "simulated data",
                     "sklearn": sklearn.__version__}, args.models_dir / f"{slug}.joblib")

    # ---- plots ----
    def curve(slug, label, color):
        return label, color, ty, scores_test[slug][test_idx][eval_mask[test_idx]]
    plot_comparison(rows, args.out / "model_comparison.png")
    plot_roc_pr([
        curve("threshold_rule", "Fixed-threshold rule", FAMILY_COLOR["baseline"]),
        curve(best_meta["supervised"], best_meta["supervised_name"], FAMILY_COLOR["supervised"]),
        curve(best_meta["unsupervised"], best_meta["unsupervised_name"], FAMILY_COLOR["unsupervised"]),
    ], args.out / "roc_pr.png")
    plot_importance(importance, args.out / "feature_importance.png")
    ep_s, _ = runs(y[lo_t:hi_t] == 1)
    if ep_s.size:
        w_lo = lo_t + int(ep_s[min(1, ep_s.size - 1)]) - 90
        plot_timeline(frame, y, preds_test[best_meta["supervised"]], preds_test["threshold_rule"],
                      max(w_lo, lo_t), min(w_lo + 540, hi_t), best_meta["supervised_name"], args.out / "detection_timeline.png")

    print(f"\nDone. Results in {args.out}  ·  models in {args.models_dir}")


if __name__ == "__main__":
    main()
