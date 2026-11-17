from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class ThreatIntelligence(Base):
    __tablename__ = "threat_intelligence"

    id = Column(Integer, primary_key=True)
    ioc_type = Column(String(20), nullable=False)
    ioc_value = Column(String(1000), nullable=False)
    threat_type = Column(String(100))
    confidence = Column(Integer, nullable=False, default=50)
    source = Column(String(100))
    first_seen = Column(DateTime(timezone=True))
    last_seen = Column(DateTime(timezone=True))
    is_active = Column(Boolean, nullable=False, default=True)
    extra_metadata = Column("metadata", JSONB)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("ioc_type IN ('IP','DOMAIN','HASH','URL','EMAIL')", name="ck_ti_ioc_type"),
        CheckConstraint("confidence BETWEEN 0 AND 100", name="ck_ti_confidence"),
        UniqueConstraint("ioc_type", "ioc_value", name="uq_ti_type_value"),
    )
