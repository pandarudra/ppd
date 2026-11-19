from sqlalchemy import func
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import ThreatIntelligence


def lookup(db: Session, ioc_value: str, ioc_type: str) -> ThreatIntelligence | None:
    return (
        db.query(ThreatIntelligence)
        .filter(ThreatIntelligence.ioc_value == ioc_value, func.upper(ThreatIntelligence.ioc_type) == ioc_type.upper())
        .first()
    )


def add_ioc(
    db: Session,
    ioc_type: str,
    ioc_value: str,
    threat_type: str | None,
    confidence: int,
    source: str | None,
    metadata: dict | None,
) -> ThreatIntelligence:
    now = datetime.now(timezone.utc)
    ioc = ThreatIntelligence(
        ioc_type=ioc_type.upper(),
        ioc_value=ioc_value,
        threat_type=threat_type,
        confidence=confidence,
        source=source,
        extra_metadata=metadata,
        first_seen=now,
        last_seen=now,
    )
    db.add(ioc)
    db.commit()
    db.refresh(ioc)
    return ioc


def list_iocs(
    db: Session,
    ioc_type: str | None = None,
    is_active: bool | None = None,
    confidence_min: int | None = None,
    page: int = 1,
    per_page: int = 50,
) -> tuple[list[ThreatIntelligence], int]:
    query = db.query(ThreatIntelligence)
    if ioc_type:
        query = query.filter(func.upper(ThreatIntelligence.ioc_type) == ioc_type.upper())
    if is_active is not None:
        query = query.filter(ThreatIntelligence.is_active == is_active)
    if confidence_min is not None:
        query = query.filter(ThreatIntelligence.confidence >= confidence_min)

    total = query.count()
    iocs = (
        query.order_by(ThreatIntelligence.confidence.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return iocs, total
