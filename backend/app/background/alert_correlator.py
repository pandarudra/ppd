from datetime import timedelta

from sqlalchemy.orm import Session

from app.models import Alert, AlertGroup, SecurityEvent

WINDOW_MINUTES = 10
SEVERITY_RANK = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "INFO": 0}


def _attach_group(db: Session, alerts: list[Alert], title: str, correlation_key: str | None) -> AlertGroup:
    existing_group_id = next((a.alert_group_id for a in alerts if a.alert_group_id), None)
    if existing_group_id:
        group = db.query(AlertGroup).filter(AlertGroup.id == existing_group_id).first()
    else:
        group = AlertGroup(
            title=title,
            correlation_key=correlation_key,
            severity=max(alerts, key=lambda a: SEVERITY_RANK.get(a.severity, 0)).severity,
            status="open",
        )
        db.add(group)
        db.flush()

    for alert in alerts:
        alert.alert_group_id = group.id

    group.alert_count = len(alerts)
    db.commit()
    db.refresh(group)
    return group


def correlate_alert(db: Session, alert: Alert) -> AlertGroup | None:
    """Group `alert` with other open alerts from the same source IP within WINDOW_MINUTES."""
    event = db.query(SecurityEvent).filter(SecurityEvent.id == alert.event_id).first()
    if event is None or not event.source_ip:
        return None

    window_start = alert.created_at - timedelta(minutes=WINDOW_MINUTES)
    related_alerts = (
        db.query(Alert)
        .join(SecurityEvent, Alert.event_id == SecurityEvent.id)
        .filter(
            SecurityEvent.source_ip == event.source_ip,
            Alert.status == "open",
            Alert.created_at >= window_start,
        )
        .all()
    )

    if len(related_alerts) < 2:
        return None

    return _attach_group(db, related_alerts, f"Alert Group: {event.source_ip}", str(event.source_ip))


def correlate_explicit(db: Session, alerts: list[Alert], correlation_key: str | None) -> AlertGroup:
    """Manually group an analyst-selected set of alerts (POST /alerts/correlate)."""
    title = f"Alert Group: {correlation_key}" if correlation_key else "Manually Grouped Alerts"
    return _attach_group(db, alerts, title, correlation_key)
