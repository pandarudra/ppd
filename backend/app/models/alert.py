import uuid

from sqlalchemy import (
    ARRAY,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class AlertGroup(Base):
    __tablename__ = "alert_groups"

    id = Column(Integer, primary_key=True)
    group_uuid = Column(UUID(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    correlation_key = Column(String(255))
    alert_count = Column(Integer, nullable=False, default=0)
    severity = Column(String(20), nullable=False)
    status = Column(String(50), nullable=False, default="open")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True)
    alert_id = Column(UUID(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    severity = Column(String(20), nullable=False)
    status = Column(String(50), nullable=False, default="open")
    event_id = Column(Integer, ForeignKey("security_events.id"))
    detection_result_id = Column(Integer, ForeignKey("detection_results.id"))
    assigned_to = Column(Integer, ForeignKey("users.id"))
    alert_group_id = Column(Integer, ForeignKey("alert_groups.id"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    resolved_at = Column(DateTime(timezone=True))
    tags = Column(ARRAY(String), default=list)

    __table_args__ = (
        CheckConstraint(
            "severity IN ('CRITICAL','HIGH','MEDIUM','LOW','INFO')", name="ck_alerts_severity"
        ),
        CheckConstraint(
            "status IN ('open','acknowledged','in_progress','resolved','false_positive','closed')",
            name="ck_alerts_status",
        ),
    )
