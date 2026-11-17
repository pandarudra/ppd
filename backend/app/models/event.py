import uuid

from sqlalchemy import CheckConstraint, Column, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID

from app.core.database import Base


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True)
    event_id = Column(UUID(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4)
    source_ip = Column(INET)
    dest_ip = Column(INET)
    source_port = Column(Integer)
    dest_port = Column(Integer)
    protocol = Column(String(20))
    event_type = Column(String(100))
    raw_log = Column(Text, nullable=False)
    normalized_data = Column(JSONB)
    ingested_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    event_timestamp = Column(DateTime(timezone=True))
    status = Column(String(50), nullable=False, default="pending")
    source_format = Column(String(20))

    __table_args__ = (
        CheckConstraint("source_port BETWEEN 0 AND 65535", name="ck_events_source_port"),
        CheckConstraint("dest_port BETWEEN 0 AND 65535", name="ck_events_dest_port"),
        CheckConstraint(
            "status IN ('pending','processing','processed','failed')", name="ck_events_status"
        ),
        CheckConstraint(
            "source_format IN ('syslog','json','csv','cef','unknown')",
            name="ck_events_source_format",
        ),
    )
