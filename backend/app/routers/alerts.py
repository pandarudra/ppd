from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.background.alert_correlator import correlate_explicit
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models import Alert, DetectionResult, SecurityEvent, User
from app.schemas.alert import (
    AlertAssignRequest,
    AlertCommentRequest,
    AlertDetail,
    AlertListItem,
    AlertListResponse,
    AlertStatusUpdate,
    AssigneeSummary,
    CorrelateRequest,
    CorrelateResponse,
    DetectionSummary,
    EventSummary,
)
from app.services import alert_service
from app.ws.manager import ws_manager

router = APIRouter(prefix="/api/v1/alerts", tags=["alerts"])


def _assignee_summary(db: Session, user_id: int | None) -> AssigneeSummary | None:
    if user_id is None:
        return None
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        return None
    return AssigneeSummary(id=user.id, full_name=user.full_name)


def _list_item(db: Session, alert: Alert) -> AlertListItem:
    event = db.query(SecurityEvent).filter(SecurityEvent.id == alert.event_id).first()
    detection = (
        db.query(DetectionResult).filter(DetectionResult.id == alert.detection_result_id).first()
    )
    return AlertListItem(
        id=alert.id,
        alert_id=str(alert.alert_id),
        title=alert.title,
        severity=alert.severity,
        status=alert.status,
        confidence_score=detection.confidence_score if detection else None,
        source_ip=event.source_ip if event else None,
        created_at=alert.created_at,
        assigned_to=_assignee_summary(db, alert.assigned_to),
    )


def _detail(db: Session, alert: Alert) -> AlertDetail:
    event = db.query(SecurityEvent).filter(SecurityEvent.id == alert.event_id).first()
    detection = (
        db.query(DetectionResult).filter(DetectionResult.id == alert.detection_result_id).first()
    )
    return AlertDetail(
        id=alert.id,
        alert_id=str(alert.alert_id),
        title=alert.title,
        description=alert.description,
        severity=alert.severity,
        status=alert.status,
        event=EventSummary(
            event_id=str(event.event_id), source_ip=event.source_ip, dest_port=event.dest_port
        )
        if event
        else None,
        detection=DetectionSummary(
            confidence_score=detection.confidence_score, risk_level=detection.risk_level
        )
        if detection
        else None,
        assigned_to=_assignee_summary(db, alert.assigned_to),
        tags=alert.tags or [],
        created_at=alert.created_at,
    )


def _get_or_404(db: Session, alert_id: str) -> Alert:
    alert = alert_service.get_alert_by_uuid(db, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.get("", response_model=AlertListResponse)
async def list_alerts(
    severity: str | None = None,
    status: str | None = None,
    assigned_to: int | None = None,
    page: int = 1,
    per_page: int = 25,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alerts, total = alert_service.list_alerts(db, severity, status, assigned_to, page, per_page)
    return AlertListResponse(
        alerts=[_list_item(db, a) for a in alerts], total=total, page=page, per_page=per_page
    )


@router.get("/{alert_id}", response_model=AlertDetail)
async def get_alert(
    alert_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    alert = _get_or_404(db, alert_id)
    return _detail(db, alert)


@router.put("/{alert_id}/status")
async def update_alert_status(
    alert_id: str,
    payload: AlertStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("analyst", "admin")),
):
    alert = _get_or_404(db, alert_id)
    alert = alert_service.update_status(db, alert, payload.status, payload.note)
    await ws_manager.broadcast_to_role(
        "analyst",
        {
            "type": "alert_updated",
            "payload": {
                "alert_id": str(alert.alert_id),
                "status": alert.status,
                "assigned_to": alert.assigned_to,
                "updated_at": alert.updated_at.isoformat(),
            },
        },
    )
    return {
        "alert_id": str(alert.alert_id),
        "status": alert.status,
        "updated_at": alert.updated_at,
    }


@router.put("/{alert_id}/assign")
async def assign_alert(
    alert_id: str,
    payload: AlertAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("analyst", "admin")),
):
    alert = _get_or_404(db, alert_id)
    assignee = db.query(User).filter(User.id == payload.assign_to_user_id).first()
    if assignee is None:
        raise HTTPException(status_code=404, detail="User not found")

    alert = alert_service.assign(db, alert, assignee)
    await ws_manager.broadcast_to_role(
        "analyst",
        {
            "type": "alert_updated",
            "payload": {
                "alert_id": str(alert.alert_id),
                "status": alert.status,
                "assigned_to": alert.assigned_to,
                "updated_at": alert.updated_at.isoformat(),
            },
        },
    )
    return {
        "alert_id": str(alert.alert_id),
        "assigned_to": {"id": assignee.id, "full_name": assignee.full_name},
        "updated_at": alert.updated_at,
    }


@router.post("/{alert_id}/comment", status_code=201)
async def comment_on_alert(
    alert_id: str,
    payload: AlertCommentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = _get_or_404(db, alert_id)
    return alert_service.add_comment(db, alert, current_user, payload.comment)


@router.post("/correlate", status_code=201, response_model=CorrelateResponse)
async def correlate_alerts(
    payload: CorrelateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("analyst", "admin")),
):
    alerts = db.query(Alert).filter(Alert.alert_id.in_(payload.alert_ids)).all()
    if len(alerts) < 2:
        raise HTTPException(status_code=400, detail="At least two valid alert_ids are required")

    group = correlate_explicit(db, alerts, payload.correlation_key)
    return CorrelateResponse(
        group_id=str(group.group_uuid),
        title=group.title,
        alert_count=group.alert_count,
        severity=group.severity,
    )
