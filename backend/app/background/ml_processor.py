import logging

from starlette.concurrency import run_in_threadpool

from app.core.database import SessionLocal
from app.models import SecurityEvent
from app.services import alert_service, detection_service, rules
from app.services import feature_extractor
from app.services.geo import locate
from app.ws.manager import ws_manager

logger = logging.getLogger(__name__)

ALERTABLE_RISK_LEVELS = ("MEDIUM", "HIGH", "CRITICAL")


async def _broadcast(message: dict) -> None:
    for role in ("analyst", "admin"):
        await ws_manager.broadcast_to_role(role, message)


# The DB is remote, so every query is slow. Each stage below is plain sync code run in the
# threadpool so the event loop (and every other request) keeps moving while it waits.

def _prepare(event_id: int) -> dict | None:
    db = SessionLocal()
    try:
        event = db.query(SecurityEvent).filter(SecurityEvent.id == event_id).first()
        if event is None:
            return None
        event.status = "processing"
        db.commit()
        return feature_extractor.extract_features(event)
    finally:
        db.close()


def _mark_failed(event_id: int) -> None:
    db = SessionLocal()
    try:
        db.query(SecurityEvent).filter(SecurityEvent.id == event_id).update({"status": "failed"})
        db.commit()
    finally:
        db.close()


def _persist(event_id: int, ml_response: dict, features: dict) -> tuple[dict, dict | None]:
    from app.background.alert_correlator import correlate_alert

    db = SessionLocal()
    try:
        event = db.query(SecurityEvent).filter(SecurityEvent.id == event_id).first()
        ml_response = rules.apply(ml_response, event, features)  # hybrid: signatures can only raise risk
        detection = detection_service.save_detection_result(db, event, ml_response, features)
        event.status = "processed"
        db.commit()

        event_msg = {
            "type": "new_event",
            "payload": {
                "event_id": str(event.event_id),
                "source_ip": event.source_ip,
                "dest_ip": event.dest_ip,
                "dest_port": event.dest_port,
                "protocol": event.protocol,
                "event_type": event.event_type,
                "prediction": detection.prediction_label,
                "risk_level": detection.risk_level,
                "geo": locate(event.source_ip),
                "ts": event.ingested_at.isoformat() if event.ingested_at else None,
            },
        }

        alert_msg = None
        if detection.risk_level in ALERTABLE_RISK_LEVELS:
            alert = alert_service.create_alert(db, event, detection)
            correlate_alert(db, alert)
            alert_msg = {
                "type": "new_alert",
                "payload": {
                    "alert_id": str(alert.alert_id),
                    "title": alert.title,
                    "severity": alert.severity,
                    "source_ip": event.source_ip,
                    "created_at": alert.created_at.isoformat(),
                },
            }
        return event_msg, alert_msg
    finally:
        db.close()


async def process_event(event_id: int) -> None:
    features = await run_in_threadpool(_prepare, event_id)
    if features is None:
        logger.warning("process_event: no event with id=%s", event_id)
        return

    ml_response = await detection_service.call_ml_service(features)
    if ml_response is None:
        await run_in_threadpool(_mark_failed, event_id)
        logger.warning("process_event: ML service unreachable for event_id=%s", event_id)
        return

    event_msg, alert_msg = await run_in_threadpool(_persist, event_id, ml_response, features)
    await _broadcast(event_msg)
    if alert_msg:
        await _broadcast(alert_msg)
