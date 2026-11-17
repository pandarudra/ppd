from sqlalchemy import CheckConstraint, Column, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class DetectionResult(Base):
    __tablename__ = "detection_results"

    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("security_events.id", ondelete="CASCADE"))
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50))
    prediction_label = Column(String(50), nullable=False)
    confidence_score = Column(Float, nullable=False)
    anomaly_score = Column(Float)
    risk_level = Column(String(20))
    feature_values = Column(JSONB)
    model_scores = Column(JSONB)
    processed_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "confidence_score BETWEEN 0.0 AND 1.0", name="ck_detection_confidence_score"
        ),
        CheckConstraint(
            "risk_level IN ('CRITICAL','HIGH','MEDIUM','LOW','INFO')",
            name="ck_detection_risk_level",
        ),
    )
