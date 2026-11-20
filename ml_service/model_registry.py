import json
from pathlib import Path

import joblib

from ensemble.ensemble import combine
from pipeline.feature_extractor import FEATURE_ORDER
from pipeline.preprocessor import to_vector

MODEL_DIR = Path(__file__).resolve().parent / "models"


class ModelRegistry:
    _models: dict = {}
    _metrics: dict = {}

    @classmethod
    def load_all(cls) -> None:
        cls._models["isolation_forest"] = joblib.load(MODEL_DIR / "isolation_forest.joblib")
        cls._models["random_forest"] = joblib.load(MODEL_DIR / "random_forest.joblib")
        cls._models["xgboost"] = joblib.load(MODEL_DIR / "xgboost_model.joblib")
        cls._models["scaler"] = joblib.load(MODEL_DIR / "scaler.joblib")

        metrics_path = MODEL_DIR / "metrics.json"
        if metrics_path.exists():
            cls._metrics = json.loads(metrics_path.read_text())
        # Models trained before curves were saved still get feature importance from the artifact itself.
        for key, name in (("random_forest", "random_forest"), ("xgboost", "xgboost")):
            m = cls._metrics.get(name)
            if m is not None and "feature_importance" not in m:
                m["feature_importance"] = {
                    n: round(float(v), 5) for n, v in zip(FEATURE_ORDER, cls._models[key].feature_importances_)
                }

    @classmethod
    def is_loaded(cls) -> bool:
        return bool(cls._models)

    @classmethod
    def metrics(cls) -> dict:
        return cls._metrics

    @classmethod
    def predict(cls, features: dict) -> dict:
        vector = to_vector(features)
        scaled = cls._models["scaler"].transform(vector)

        if_raw_score = cls._models["isolation_forest"].decision_function(scaled)[0]
        # decision_function: higher = more normal. Flip and clip to an
        # anomaly score in [0, 1] (IsolationForest's own output isn't bounded).
        if_anomaly_score = max(0.0, min(1.0, 0.5 - if_raw_score))

        rf_proba = cls._models["random_forest"].predict_proba(scaled)[0][1]
        xgb_proba = cls._models["xgboost"].predict_proba(scaled)[0][1]

        return combine(if_anomaly_score, float(rf_proba), float(xgb_proba))
