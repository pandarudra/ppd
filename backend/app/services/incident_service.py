from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Alert, Incident, IncidentAlert, InvestigationHistory, ResponseAction, User


def log_history(
    db: Session,
    incident_id: int,
    user_id: int | None,
    action_type: str,
    description: str,
    metadata: dict | None = None,
) -> InvestigationHistory:
    entry = InvestigationHistory(
        incident_id=incident_id,
        user_id=user_id,
        action_type=action_type,
        description=description,
        extra_metadata=metadata,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def create_incident(
    db: Session, creator: User, title: str, description: str | None, severity: str, alert_ids: list[str]
) -> Incident:
    incident = Incident(title=title, description=description, severity=severity, created_by=creator.id)
    db.add(incident)
    db.flush()

    alerts = db.query(Alert).filter(Alert.alert_id.in_(alert_ids)).all() if alert_ids else []
    for alert in alerts:
        db.add(IncidentAlert(incident_id=incident.id, alert_id=alert.id, linked_by=creator.id))

    db.commit()
    db.refresh(incident)

    log_history(
        db,
        incident.id,
        creator.id,
        "note_added",
        f"Incident created from {len(alerts)} linked alert(s)",
    )
    return incident


def link_alerts(db: Session, incident: Incident, user: User, alert_ids: list[str]) -> int:
    alerts = db.query(Alert).filter(Alert.alert_id.in_(alert_ids)).all()
    already_linked = {
        ia.alert_id
        for ia in db.query(IncidentAlert).filter(IncidentAlert.incident_id == incident.id).all()
    }

    newly_linked = 0
    for alert in alerts:
        if alert.id in already_linked:
            continue
        db.add(IncidentAlert(incident_id=incident.id, alert_id=alert.id, linked_by=user.id))
        newly_linked += 1

    db.commit()

    if newly_linked:
        log_history(db, incident.id, user.id, "alert_linked", f"Linked {newly_linked} alert(s)")
    return newly_linked


def update_incident(db: Session, incident: Incident, user: User, changes: dict) -> Incident:
    old_status = incident.status
    for field, value in changes.items():
        if value is not None:
            setattr(incident, field, value)
    incident.updated_at = datetime.now(timezone.utc)
    if changes.get("status") in ("closed", "resolved"):
        incident.closed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(incident)

    if changes.get("status") and changes["status"] != old_status:
        log_history(
            db,
            incident.id,
            user.id,
            "status_changed",
            f"Status changed from {old_status} to {incident.status}",
            metadata={"old_status": old_status, "new_status": incident.status},
        )
    return incident


def get_timeline(db: Session, incident_id: int) -> list[InvestigationHistory]:
    return (
        db.query(InvestigationHistory)
        .filter(InvestigationHistory.incident_id == incident_id)
        .order_by(InvestigationHistory.created_at.asc())
        .all()
    )


def list_incidents(
    db: Session,
    status: str | None = None,
    severity: str | None = None,
    assigned_to: int | None = None,
    page: int = 1,
    per_page: int = 25,
) -> tuple[list[Incident], int]:
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    if severity:
        query = query.filter(Incident.severity == severity)
    if assigned_to is not None:
        query = query.filter(Incident.assigned_to == assigned_to)

    total = query.count()
    incidents = (
        query.order_by(Incident.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return incidents, total


def get_incident_by_uuid(db: Session, incident_id: str) -> Incident | None:
    return db.query(Incident).filter(Incident.incident_id == incident_id).first()


def request_response_action(
    db: Session, incident: Incident, requester: User, action_type: str, action_description: str
) -> ResponseAction:
    action = ResponseAction(
        incident_id=incident.id,
        action_type=action_type,
        action_description=action_description,
        requested_by=requester.id,
        status="pending",
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    log_history(
        db, incident.id, requester.id, "action_requested", f"Requested action: {action_type}"
    )
    return action


class ResponseActionError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def decide_response_action(
    db: Session,
    action: ResponseAction,
    approver: User,
    decision: str,
    rejection_reason: str | None = None,
) -> ResponseAction:
    if decision == "approve" and action.requested_by == approver.id:
        raise ResponseActionError(400, "A response action cannot be approved by its requester")

    if decision == "approve":
        action.status = "approved"
        action.approved_by = approver.id
        log_history(
            db,
            action.incident_id,
            approver.id,
            "action_approved",
            f"Approved action: {action.action_type}",
        )
    elif decision == "reject":
        action.status = "rejected"
        action.rejection_reason = rejection_reason
        log_history(
            db,
            action.incident_id,
            approver.id,
            "action_rejected",
            f"Rejected action: {action.action_type}",
        )
    else:
        raise ResponseActionError(422, "decision must be 'approve' or 'reject'")

    action.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(action)
    return action
