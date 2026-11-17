from datetime import datetime

from sqlalchemy.orm import Session

from app.models import DetectionResult, SecurityEvent
from app.schemas.event import EventIngestSchema
from app.services import log_normalizer


def save_event(db: Session, schema: EventIngestSchema) -> SecurityEvent:
    source_format = schema.source_format or log_normalizer.detect_format(schema.raw_log)
    normalized = log_normalizer.normalize(schema.raw_log, source_format)

    event = SecurityEvent(
        raw_log=schema.raw_log,
        source_format=source_format,
        source_ip=normalized["source_ip"],
        dest_ip=normalized["dest_ip"],
        source_port=normalized["source_port"],
        dest_port=normalized["dest_port"],
        protocol=normalized["protocol"],
        event_type=normalized["event_type"],
        normalized_data=normalized["normalized_data"],
        status="pending",
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def list_events(
    db: Session,
    source_ip: str | None = None,
    event_type: str | None = None,
    status: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    page: int = 1,
    per_page: int = 50,
) -> tuple[list[SecurityEvent], int]:
    query = db.query(SecurityEvent)
    if source_ip:
        query = query.filter(SecurityEvent.source_ip == source_ip)
    if event_type:
        query = query.filter(SecurityEvent.event_type == event_type)
    if status:
        query = query.filter(SecurityEvent.status == status)
    if date_from:
        query = query.filter(SecurityEvent.ingested_at >= date_from)
    if date_to:
        query = query.filter(SecurityEvent.ingested_at <= date_to)

    total = query.count()
    events = (
        query.order_by(SecurityEvent.ingested_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return events, total


def get_event_by_uuid(db: Session, event_id: str) -> SecurityEvent | None:
    return db.query(SecurityEvent).filter(SecurityEvent.event_id == event_id).first()


def get_latest_detection(db: Session, event_pk: int) -> DetectionResult | None:
    return (
        db.query(DetectionResult)
        .filter(DetectionResult.event_id == event_pk)
        .order_by(DetectionResult.processed_at.desc())
        .first()
    )


def delete_event(db: Session, event: SecurityEvent) -> None:
    db.delete(event)
    db.commit()
