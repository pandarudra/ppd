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
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.utils.class_weight import compute_sample_weight

from training.data_prep import DATA_PATH, load_and_split

MODEL_DIR = Path(__file__).resolve().parents[1] / "models"


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
