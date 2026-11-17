import pytest

from app.background import ml_processor
from app.core.database import SessionLocal
from app.models import Alert, DetectionResult, SecurityEvent
from app.schemas.event import EventIngestSchema
from app.services import detection_service, event_service

HIGH_RISK_RAW_LOG = (
    "Nov 15 10:23:45 firewall kernel: DROP IN=eth0 SRC=203.0.113.50 "
    "DST=10.0.0.5 PROTO=TCP DPT=22"
)


@pytest.mark.asyncio
async def test_full_pipeline_event_to_alert():
    # process_event opens its own DB session (as a real background task would),
    # so this test commits through a standalone session rather than the
    # rollback-wrapped `db` fixture, and cleans up explicitly after.
    setup_db = SessionLocal()
    event = event_service.save_event(
        setup_db, EventIngestSchema(raw_log=HIGH_RISK_RAW_LOG, source_format="syslog")
    )
    event_id = event.id
    setup_db.close()

    try:
        await ml_processor.process_event(event_id)

        verify_db = SessionLocal()
        try:
            detection = (
                verify_db.query(DetectionResult)
                .filter(DetectionResult.event_id == event_id)
                .first()
            )
            assert detection is not None
            assert detection.risk_level in ("MEDIUM", "HIGH", "CRITICAL")

            alert = verify_db.query(Alert).filter(Alert.event_id == event_id).first()
            assert alert is not None
            assert alert.severity == detection.risk_level
        finally:
            verify_db.close()
    finally:
        cleanup_db = SessionLocal()
        cleanup_db.query(Alert).filter(Alert.event_id == event_id).delete()
        cleanup_db.query(DetectionResult).filter(DetectionResult.event_id == event_id).delete()
        cleanup_db.query(SecurityEvent).filter(SecurityEvent.id == event_id).delete()
        cleanup_db.commit()
        cleanup_db.close()


@pytest.mark.asyncio
async def test_ml_service_down_marks_event_failed(monkeypatch):
    monkeypatch.setattr(detection_service.settings, "ML_SERVICE_URL", "http://localhost:1")

    setup_db = SessionLocal()
    event = event_service.save_event(
        setup_db, EventIngestSchema(raw_log=HIGH_RISK_RAW_LOG, source_format="syslog")
    )
    event_id = event.id
    setup_db.close()

    try:
        await ml_processor.process_event(event_id)

        verify_db = SessionLocal()
        try:
            refreshed = verify_db.query(SecurityEvent).filter(SecurityEvent.id == event_id).first()
            assert refreshed.status == "failed"

            detection = (
                verify_db.query(DetectionResult)
                .filter(DetectionResult.event_id == event_id)
                .first()
            )
            assert detection is None
        finally:
            verify_db.close()
    finally:
        cleanup_db = SessionLocal()
        cleanup_db.query(SecurityEvent).filter(SecurityEvent.id == event_id).delete()
        cleanup_db.commit()
        cleanup_db.close()
