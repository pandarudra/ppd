from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models import Alert, Incident, IncidentAlert, ResponseAction, User
from app.schemas.incident import (
    IncidentCreate,
    IncidentDetail,
    IncidentListResponse,
    IncidentUpdate,
    LinkAlertsRequest,
    LinkedAlertSummary,
    ResponseActionCreate,
    ResponseActionDecision,
    TimelineEntry,
    TimelineResponse,
    UserRef,
)
from app.services import incident_service
from app.ws.manager import ws_manager

router = APIRouter(prefix="/api/v1/incidents", tags=["incidents"])


def _user_ref(db: Session, user_id: int | None) -> UserRef | None:
    if user_id is None:
        return None
    user = db.query(User).filter(User.id == user_id).first()
    return UserRef(id=user.id, full_name=user.full_name) if user else None


def _alert_count(db: Session, incident_id: int) -> int:
    return db.query(IncidentAlert).filter(IncidentAlert.incident_id == incident_id).count()


def _get_or_404(db: Session, incident_id: str) -> Incident:
    incident = incident_service.get_incident_by_uuid(db, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.get("", response_model=IncidentListResponse)
async def list_incidents(
    status: str | None = None,
    severity: str | None = None,
    assigned_to: int | None = None,
    page: int = 1,
    per_page: int = 25,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incidents, total = incident_service.list_incidents(
        db, status, severity, assigned_to, page, per_page
    )
    items = []
    for incident in incidents:
        assignee = db.query(User).filter(User.id == incident.assigned_to).first()
        items.append(
            {
                "id": incident.id,
                "incident_id": str(incident.incident_id),
                "title": incident.title,
                "status": incident.status,
                "severity": incident.severity,
                "assigned_to": assignee.full_name if assignee else None,
                "alert_count": _alert_count(db, incident.id),
                "created_at": incident.created_at,
            }
        )
    return IncidentListResponse(incidents=items, total=total, page=page, per_page=per_page)


@router.post("", status_code=201)
async def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("analyst", "admin")),
):
    incident = incident_service.create_incident(
        db, current_user, payload.title, payload.description, payload.severity, payload.alert_ids
    )
    await ws_manager.broadcast_to_role(
        "analyst",
        {
            "type": "incident_created",
            "payload": {
                "incident_id": str(incident.incident_id),
                "title": incident.title,
                "severity": incident.severity,
                "alert_count": _alert_count(db, incident.id),
            },
        },
    )
    return {
        "incident_id": str(incident.incident_id),
        "title": incident.title,
        "status": incident.status,
        "severity": incident.severity,
        "created_at": incident.created_at,
    }


@router.get("/{incident_id}", response_model=IncidentDetail)
async def get_incident(
    incident_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    incident = _get_or_404(db, incident_id)

    linked = (
        db.query(Alert)
        .join(IncidentAlert, Alert.id == IncidentAlert.alert_id)
        .filter(IncidentAlert.incident_id == incident.id)
        .all()
    )

    return IncidentDetail(
        incident_id=str(incident.incident_id),
        title=incident.title,
        description=incident.description,
        status=incident.status,
        severity=incident.severity,
        created_by=_user_ref(db, incident.created_by),
        assigned_to=_user_ref(db, incident.assigned_to),
        linked_alerts=[
            LinkedAlertSummary(alert_id=str(a.alert_id), title=a.title, severity=a.severity)
            for a in linked
        ],
        created_at=incident.created_at,
        updated_at=incident.updated_at,
    )


@router.put("/{incident_id}")
async def update_incident(
    incident_id: str,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("analyst", "admin")),
):
    incident = _get_or_404(db, incident_id)
    incident = incident_service.update_incident(db, incident, current_user, payload.model_dump())

    await ws_manager.broadcast_to_role(
        "analyst",
        {
            "type": "incident_updated",
            "payload": {
                "incident_id": str(incident.incident_id),
                "status": incident.status,
                "updated_at": incident.updated_at.isoformat(),
            },
        },
    )
    return {
        "incident_id": str(incident.incident_id),
        "status": incident.status,
        "updated_at": incident.updated_at,
    }


@router.post("/{incident_id}/alerts")
async def link_incident_alerts(
    incident_id: str,
    payload: LinkAlertsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("analyst", "admin")),
):
    incident = _get_or_404(db, incident_id)
    newly_linked = incident_service.link_alerts(db, incident, current_user, payload.alert_ids)
    return {
        "incident_id": str(incident.incident_id),
        "newly_linked": newly_linked,
        "total_alerts": _alert_count(db, incident.id),
    }


@router.get("/{incident_id}/timeline", response_model=TimelineResponse)
async def get_incident_timeline(
    incident_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    incident = _get_or_404(db, incident_id)
    history = incident_service.get_timeline(db, incident.id)

    entries = []
    for h in history:
        user = db.query(User).filter(User.id == h.user_id).first() if h.user_id else None
        entries.append(
            TimelineEntry(
                id=h.id,
                action_type=h.action_type,
                description=h.description,
                user=user.full_name if user else "SENTINEL-AI",
                created_at=h.created_at,
            )
        )
    return TimelineResponse(incident_id=str(incident.incident_id), timeline=entries)


@router.post("/{incident_id}/response-actions", status_code=201)
async def request_response_action(
    incident_id: str,
    payload: ResponseActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("analyst", "admin")),
):
    incident = _get_or_404(db, incident_id)
    action = incident_service.request_response_action(
        db, incident, current_user, payload.action_type, payload.action_description
    )
    return {
        "action_id": str(action.action_uuid),
        "status": action.status,
        "action_type": action.action_type,
        "requested_by": current_user.full_name,
    }


@router.put("/{incident_id}/response-actions/{action_id}")
async def decide_response_action(
    incident_id: str,
    action_id: str,
    payload: ResponseActionDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("analyst", "admin")),
):
    incident = _get_or_404(db, incident_id)
    action = (
        db.query(ResponseAction)
        .filter(ResponseAction.action_uuid == action_id, ResponseAction.incident_id == incident.id)
        .first()
    )
    if action is None:
        raise HTTPException(status_code=404, detail="Response action not found")

    try:
        action = incident_service.decide_response_action(
            db, action, current_user, payload.decision, payload.rejection_reason
        )
    except incident_service.ResponseActionError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    return {
        "action_id": str(action.action_uuid),
        "status": action.status,
        "approved_by": current_user.full_name if action.status == "approved" else None,
    }
