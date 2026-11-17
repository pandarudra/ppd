import uuid

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.core.database import Base


class ResponseAction(Base):
    __tablename__ = "response_actions"

    id = Column(Integer, primary_key=True)
    action_uuid = Column(UUID(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    action_type = Column(String(100), nullable=False)
    action_description = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"))
    rejection_reason = Column(Text)
    executed_at = Column(DateTime(timezone=True))
    audit_trail = Column(JSONB)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','approved','rejected','executing','completed','failed')",
            name="ck_response_actions_status",
        ),
    )
