from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import INET, JSONB

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(255), nullable=False)
    resource_type = Column(String(100))
    resource_id = Column(String(100))
    ip_address = Column(INET)
    user_agent = Column(Text)
    before_state = Column(JSONB)
    after_state = Column(JSONB)
    success = Column(Boolean, nullable=False, default=True)
    error_message = Column(Text)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
