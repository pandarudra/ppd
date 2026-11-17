import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import DetectionResult, SecurityEvent

RISK_THRESHOLDS = [
    ("CRITICAL", 0.9),
    ("HIGH", 0.75),
    ("MEDIUM", 0.5),
]


def risk_level_for(confidence: float) -> str:
    for level, threshold in RISK_THRESHOLDS:
        if confidence >= threshold:
            return level
    return "LOW"


async def call_ml_service(features: dict) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{settings.ML_SERVICE_URL}/predict", json={"features": features}
            )
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, httpx.TimeoutException):
        return None


def save_detection_result(
    db: Session, event: SecurityEvent, ml_response: dict, feature_values: dict
) -> DetectionResult:
    detection = DetectionResult(
        event_id=event.id,
        model_name="ensemble_v1",
        model_version="1.0",
        prediction_label=ml_response["prediction"],
        confidence_score=ml_response["confidence_score"],
        anomaly_score=ml_response.get("anomaly_score"),
        risk_level=ml_response.get("risk_level") or risk_level_for(ml_response["confidence_score"]),
        feature_values=feature_values,
        model_scores=ml_response.get("model_scores"),
    )
    db.add(detection)
    db.commit()
    db.refresh(detection)
    return detection
