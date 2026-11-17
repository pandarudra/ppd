"""Weighted-average ensemble formula from plan/ARCHITECTURE.md §5.6."""

IF_WEIGHT = 0.30
RF_WEIGHT = 0.35
XGB_WEIGHT = 0.35


def combine(if_anomaly_score: float, rf_malicious_proba: float, xgb_malicious_proba: float) -> dict:
    confidence = IF_WEIGHT * if_anomaly_score + RF_WEIGHT * rf_malicious_proba + XGB_WEIGHT * xgb_malicious_proba
    label = "malicious" if confidence > 0.5 else "normal"
    return {
        "prediction": label,
        "confidence": float(confidence),
        "anomaly_score": float(if_anomaly_score),
        "model_scores": {
            "isolation_forest": float(if_anomaly_score),
            "random_forest": float(rf_malicious_proba),
            "xgboost": float(xgb_malicious_proba),
        },
    }
