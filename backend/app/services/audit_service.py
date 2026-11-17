import datetime
import uuid

from sqlalchemy.orm import Session

from app.models import AuditLog

SENSITIVE_KEYS = {"password", "current_password", "new_password", "access_token", "refresh_token"}


def redact(value):
    """Recursively mask known-sensitive fields before they ever reach audit_logs."""
    if isinstance(value, dict):
        return {
            k: ("***REDACTED***" if k.lower() in SENSITIVE_KEYS else redact(v))
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [redact(v) for v in value]
    return value


def serialize_row(obj) -> dict:
    result = {}
    for col in obj.__table__.columns:
        value = getattr(obj, col.name)
        if isinstance(value, uuid.UUID):
            value = str(value)
        elif isinstance(value, (datetime.datetime, datetime.date)):
            value = value.isoformat()
        elif value is not None and not isinstance(value, (str, int, float, bool, list, dict)):
            value = str(value)
        result[col.name] = value
    return result


def write_log(
    db: Session,
    user_id: int | None,
    action: str,
    resource_type: str | None,
    resource_id: str | None,
    ip_address: str | None,
    user_agent: str | None,
    before_state,
    after_state,
    success: bool,
    error_message: str | None = None,
) -> AuditLog:
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        before_state=redact(before_state),
        after_state=redact(after_state),
        success=success,
        error_message=error_message,
    )
    db.add(log)
    db.commit()
    return log
