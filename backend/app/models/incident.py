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
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.core.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True)
    incident_id = Column(UUID(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    status = Column(String(50), nullable=False, default="open")
    severity = Column(String(20), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    assigned_to = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    closed_at = Column(DateTime(timezone=True))
    tags = Column(ARRAY(String), default=list)
    summary = Column(Text)
    mitigation_notes = Column(Text)

    __table_args__ = (
        CheckConstraint(
            "status IN ('open','investigating','contained','resolved','closed','reopened')",
            name="ck_incidents_status",
        ),
        CheckConstraint(
            "severity IN ('CRITICAL','HIGH','MEDIUM','LOW')", name="ck_incidents_severity"
        ),
    )


class IncidentAlert(Base):
    __tablename__ = "incident_alerts"

    id = Column(Integer, primary_key=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    alert_id = Column(Integer, ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False)
    linked_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    linked_by = Column(Integer, ForeignKey("users.id"))

    __table_args__ = (UniqueConstraint("incident_id", "alert_id", name="uq_incident_alert"),)


class InvestigationHistory(Base):
    __tablename__ = "investigation_history"

    id = Column(Integer, primary_key=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    action_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    extra_metadata = Column("metadata", JSONB)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
