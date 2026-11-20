"""Offline training script. Run from ml_service/: `python training/train.py`

Trains the three models in plan/AI_ML_DESIGN.md's MVP stack (Isolation Forest,
Random Forest, XGBoost) on the synthetic dataset, evaluates on a held-out test
split, and saves artifacts + a metrics.json companion file.
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import joblib
import xgboost as xgb
from sklearn.ensemble import IsolationForest, RandomForestClassifier
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.utils.class_weight import compute_sample_weight

from training.data_prep import DATA_PATH, load_and_split

MODEL_DIR = Path(__file__).resolve().parents[1] / "models"


def _thin(*arrays, n=100):
    # ponytail: even-stride downsample keeps metrics.json small; endpoints kept.
    idx = np.unique(np.linspace(0, len(arrays[0]) - 1, min(n, len(arrays[0]))).astype(int))
    return [[round(float(a[i]), 4) for i in idx] for a in arrays]


def curves(y_true, y_pred, y_score) -> dict:
    """Plot-ready payload for the UI: confusion matrix, ROC, PR and F1-vs-threshold."""
    lo, hi = float(np.min(y_score)), float(np.max(y_score))
    ths = np.linspace(lo, hi, 101)
    f1s = [f1_score(y_true, (y_score >= t).astype(int), zero_division=0) for t in ths]
    fpr, tpr, _ = roc_curve(y_true, y_score)
    prec, rec, _ = precision_recall_curve(y_true, y_score)
    # threshold axis is min-max normalised so IsolationForest's unbounded scores plot like the others
    norm = (ths - lo) / (hi - lo or 1.0)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    return {
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "roc": dict(zip(("fpr", "tpr"), _thin(fpr, tpr))),
        "pr": dict(zip(("recall", "precision"), _thin(rec, prec))),
        "f1_threshold": dict(zip(("threshold", "f1"), _thin(norm, f1s))),
    }


def importances(model, names) -> dict:
    return {n: round(float(v), 5) for n, v in zip(names, model.feature_importances_)}


def evaluate(name: str, y_true, y_pred, y_score) -> dict:
    metrics = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1_score": float(f1_score(y_true, y_pred, zero_division=0)),
        "auc_roc": float(roc_auc_score(y_true, y_score)),
    }
    print(f"\n[{name}] accuracy={metrics['accuracy']:.3f} precision={metrics['precision']:.3f} "
          f"recall={metrics['recall']:.3f} f1={metrics['f1_score']:.3f} auc={metrics['auc_roc']:.3f}")
    return metrics


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, default=DATA_PATH, help="training CSV (default: synthetic_events.csv)")
    args = ap.parse_args()
    data = load_and_split(args.data)
    X_train, y_train = data["X_train"], data["y_train"]
    X_test, y_test = data["X_test"], data["y_test"]

    isolation_forest = IsolationForest(n_estimators=200, contamination=float(min(max(data["y_train"].mean(), 0.01), 0.5)), random_state=42, n_jobs=-1)
    isolation_forest.fit(X_train)
    if_score = -isolation_forest.decision_function(X_test)  # higher = more anomalous
    if_pred = (isolation_forest.predict(X_test) == -1).astype(int)
    if_metrics = evaluate("isolation_forest", y_test, if_pred, if_score)

    random_forest = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1, class_weight="balanced")
    random_forest.fit(X_train, y_train)
    rf_pred = random_forest.predict(X_test)
    rf_score = random_forest.predict_proba(X_test)[:, 1]
    rf_metrics = evaluate("random_forest", y_test, rf_pred, rf_score)

    sample_weights = compute_sample_weight("balanced", y_train)
    xgb_model = xgb.XGBClassifier(
        n_estimators=200, learning_rate=0.05, max_depth=6, subsample=0.8, colsample_bytree=0.8,
        random_state=42, n_jobs=-1,
    )
    xgb_model.fit(X_train, y_train, sample_weight=sample_weights)
    xgb_pred = xgb_model.predict(X_test)
    xgb_score = xgb_model.predict_proba(X_test)[:, 1]
    xgb_metrics = evaluate("xgboost", y_test, xgb_pred, xgb_score)

    for m, model, y_pred, y_score in (
        (if_metrics, None, if_pred, if_score),
        (rf_metrics, random_forest, rf_pred, rf_score),
        (xgb_metrics, xgb_model, xgb_pred, xgb_score),
    ):
        m.update(curves(y_test, y_pred, y_score))
        if model is not None:
            m["feature_importance"] = importances(model, data["feature_names"])

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(isolation_forest, MODEL_DIR / "isolation_forest.joblib", compress=3)
    joblib.dump(random_forest, MODEL_DIR / "random_forest.joblib", compress=3)
    joblib.dump(xgb_model, MODEL_DIR / "xgboost_model.joblib", compress=3)
    joblib.dump(data["scaler"], MODEL_DIR / "scaler.joblib", compress=3)

    trained_at = datetime.now(timezone.utc).isoformat()
    metrics = {
        "isolation_forest": {**if_metrics, "algorithm": "IsolationForest", "dataset": args.data.name, "trained_at": trained_at},
        "random_forest": {**rf_metrics, "algorithm": "RandomForest", "dataset": args.data.name, "trained_at": trained_at},
        "xgboost": {**xgb_metrics, "algorithm": "XGBoost", "dataset": args.data.name, "trained_at": trained_at},
    }
    (MODEL_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"\nSaved artifacts and metrics.json to {MODEL_DIR}")


if __name__ == "__main__":
    main()
