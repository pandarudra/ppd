import logging

from app.core.database import SessionLocal
from app.models import SecurityEvent
from app.services import alert_service, detection_service
from app.services import feature_extractor
from app.ws.manager import ws_manager

logger = logging.getLogger(__name__)

ALERTABLE_RISK_LEVELS = ("MEDIUM", "HIGH", "CRITICAL")


async def process_event(event_id: int) -> None:
    db = SessionLocal()
    try:
        event = db.query(SecurityEvent).filter(SecurityEvent.id == event_id).first()
        if event is None:
            logger.warning("process_event: no event with id=%s", event_id)
            return

        event.status = "processing"
        db.commit()

        features = feature_extractor.extract_features(event)
        ml_response = await detection_service.call_ml_service(features)

        if ml_response is None:
            event.status = "failed"
            db.commit()
            logger.warning("process_event: ML service unreachable for event_id=%s", event_id)
            return

        detection = detection_service.save_detection_result(db, event, ml_response, features)
        event.status = "processed"
        db.commit()

        if detection.risk_level in ALERTABLE_RISK_LEVELS:
            alert = alert_service.create_alert(db, event, detection)

            from app.background.alert_correlator import correlate_alert

            correlate_alert(db, alert)

            await ws_manager.broadcast_to_role(
                "analyst",
                {
                    "type": "new_alert",
                    "payload": {
                        "alert_id": str(alert.alert_id),
                        "title": alert.title,
                        "severity": alert.severity,
                        "source_ip": event.source_ip,
                        "created_at": alert.created_at.isoformat(),
                    },
                },
            )
    finally:
        db.close()
