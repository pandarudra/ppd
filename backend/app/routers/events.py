from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.background.ml_processor import process_event
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models import DetectionResult, User
from app.schemas.event import (
    BatchIngestResponse,
    BatchIngestSchema,
    DetectionDetailResponse,
    DetectionSummary,
    EventDetail,
    EventIngestSchema,
    EventListItem,
    EventListResponse,
    EventStatusResponse,
    IngestAcceptedResponse,
)
from app.services import event_service

router = APIRouter(prefix="/api/v1/events", tags=["events"])


def _detection_summary(db: Session, event) -> DetectionSummary | None:
    detection = event_service.get_latest_detection(db, event.id)
    if detection is None:
        return None
    return DetectionSummary(
        prediction=detection.prediction_label,
        confidence_score=detection.confidence_score,
        risk_level=detection.risk_level,
    )


@router.post("/ingest", status_code=202, response_model=IngestAcceptedResponse)
def ingest_event(
    payload: EventIngestSchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("api_client", "analyst", "admin")),
):
    event = event_service.save_event(db, payload)
    background_tasks.add_task(process_event, event.id)
    return IngestAcceptedResponse(event_id=str(event.event_id))


@router.post("/ingest/batch", status_code=202, response_model=BatchIngestResponse)
def ingest_batch(
    payload: BatchIngestSchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("api_client", "admin")),
):
    event_ids = []
    for item in payload.events:
        event = event_service.save_event(db, item)
        background_tasks.add_task(process_event, event.id)
        event_ids.append(str(event.event_id))

    return BatchIngestResponse(
        batch_id=payload.batch_id,
        accepted_count=len(event_ids),
        rejected_count=0,
        event_ids=event_ids,
    )


@router.get("/status/{event_id}", response_model=EventStatusResponse)
def event_status(
    event_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    event = event_service.get_event_by_uuid(db, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return EventStatusResponse(
        event_id=str(event.event_id),
        status=event.status,
        ingested_at=event.ingested_at,
        detection_result=_detection_summary(db, event),
    )


@router.get("", response_model=EventListResponse)
def list_events(
    source_ip: str | None = None,
    event_type: str | None = None,
    status: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    page: int = 1,
    per_page: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    events, total = event_service.list_events(
        db, source_ip, event_type, status, date_from, date_to, page, per_page
    )
    # latest detection per event in one query instead of one per row (the DB is remote)
    latest = {}
    if events:
        for d in (
            db.query(DetectionResult)
            .filter(DetectionResult.event_id.in_([e.id for e in events]))
            .order_by(DetectionResult.processed_at.asc())
            .all()
        ):
            latest[d.event_id] = d  # ascending order, so the newest wins

    def summary(e):
        d = latest.get(e.id)
        return DetectionSummary(prediction=d.prediction_label, confidence_score=d.confidence_score, risk_level=d.risk_level) if d else None

    items = [
        EventListItem(
            id=e.id,
            event_id=str(e.event_id),
            source_ip=e.source_ip,
            dest_ip=e.dest_ip,
            dest_port=e.dest_port,
            protocol=e.protocol,
            event_type=e.event_type,
            status=e.status,
            ingested_at=e.ingested_at,
            detection_summary=summary(e),
        )
        for e in events
    ]
    return EventListResponse(events=items, total=total, page=page, per_page=per_page)


@router.get("/{event_id}", response_model=EventDetail)
def get_event(
    event_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    event = event_service.get_event_by_uuid(db, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return EventDetail(
        id=event.id,
        event_id=str(event.event_id),
        source_ip=event.source_ip,
        dest_ip=event.dest_ip,
        source_port=event.source_port,
        dest_port=event.dest_port,
        protocol=event.protocol,
        event_type=event.event_type,
        raw_log=event.raw_log,
        normalized_data=event.normalized_data,
        event_timestamp=event.event_timestamp,
        ingested_at=event.ingested_at,
        status=event.status,
        source_format=event.source_format,
    )


@router.get("/{event_id}/detection", response_model=DetectionDetailResponse)
def get_event_detection(
    event_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    event = event_service.get_event_by_uuid(db, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    detection = event_service.get_latest_detection(db, event.id)
    if detection is None:
        raise HTTPException(status_code=404, detail="Detection result not available yet")

    return DetectionDetailResponse(
        event_id=str(event.event_id),
        model_name=detection.model_name,
        prediction_label=detection.prediction_label,
        confidence_score=detection.confidence_score,
        risk_level=detection.risk_level,
        anomaly_score=detection.anomaly_score,
        model_scores=detection.model_scores,
        feature_values=detection.feature_values,
        processed_at=detection.processed_at,
    )


@router.delete("/{event_id}")
def delete_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    event = event_service.get_event_by_uuid(db, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    event_service.delete_event(db, event)
    return {"message": "Event deleted", "event_id": event_id}
