from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Alert, DetectionResult, SecurityEvent, User


def _humanize_event_type(event_type: str | None) -> str:
    if not event_type:
        return "Suspicious Activity"
    return event_type.replace("_", " ").title()


def create_alert(db: Session, event: SecurityEvent, detection: DetectionResult) -> Alert:
    title = f"{_humanize_event_type(event.event_type)} Detected"
    if event.source_ip:
        title += f" from {event.source_ip}"

    description = (
        f"ML ensemble flagged this event as '{detection.prediction_label}' with "
        f"{detection.confidence_score:.0%} confidence (risk level: {detection.risk_level})."
    )

    alert = Alert(
        title=title,
        description=description,
        severity=detection.risk_level,
        event_id=event.id,
        detection_result_id=detection.id,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def list_alerts(
    db: Session,
    severity: str | None = None,
    status: str | None = None,
    assigned_to: int | None = None,
    page: int = 1,
    per_page: int = 25,
) -> tuple[list[Alert], int]:
    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity == severity)
    if status:
        query = query.filter(Alert.status == status)
    if assigned_to is not None:
        query = query.filter(Alert.assigned_to == assigned_to)

    total = query.count()
    alerts = (
        query.order_by(Alert.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return alerts, total


def get_alert_by_uuid(db: Session, alert_id: str) -> Alert | None:
    return db.query(Alert).filter(Alert.alert_id == alert_id).first()


def update_status(db: Session, alert: Alert, status: str, note: str | None = None) -> Alert:
    alert.status = status
    alert.updated_at = datetime.now(timezone.utc)
    if status in ("resolved", "false_positive", "closed"):
        alert.resolved_at = datetime.now(timezone.utc)
    if note:
        alert.description = f"{alert.description}\n\n[note] {note}"
    db.commit()
    db.refresh(alert)
    return alert


def assign(db: Session, alert: Alert, user: User) -> Alert:
    alert.assigned_to = user.id
    alert.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)
    return alert


def add_comment(db: Session, alert: Alert, author: User, comment: str) -> dict:
    # No dedicated comments table in plan/DATABASE_SCHEMA.md's 13 tables;
    # append to the alert's description so the comment is at least persisted
    # and visible, and synthesize a comment_id for the response contract.
    timestamp = datetime.now(timezone.utc)
    alert.description = f"{alert.description}\n\n[{author.full_name}] {comment}"
    alert.updated_at = timestamp
    db.commit()
    db.refresh(alert)
    return {
        "comment_id": int(timestamp.timestamp() * 1000) % 1_000_000,
        "alert_id": str(alert.alert_id),
        "author": author.full_name,
        "comment": comment,
        "created_at": timestamp,
    }
