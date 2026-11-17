from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models import User
from app.schemas.intelligence import IOCCreate, IOCItem, IOCListResponse, IOCLookupResponse
from app.services import intelligence_service

router = APIRouter(prefix="/api/v1/intelligence", tags=["intelligence"])


@router.get("/lookup", response_model=IOCLookupResponse)
async def lookup_ioc(
    ioc: str,
    type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = intelligence_service.lookup(db, ioc, type)
    if result is None:
        return IOCLookupResponse(ioc_value=ioc, ioc_type=type, found=False)
    return IOCLookupResponse(
        ioc_value=result.ioc_value,
        ioc_type=result.ioc_type,
        found=True,
        threat_type=result.threat_type,
        confidence=result.confidence,
        source=result.source,
        last_seen=result.last_seen,
        is_active=result.is_active,
    )


@router.get("/iocs", response_model=IOCListResponse)
async def list_iocs(
    type: str | None = None,
    is_active: bool | None = None,
    confidence_min: int | None = None,
    page: int = 1,
    per_page: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    iocs, total = intelligence_service.list_iocs(
        db, type, is_active, confidence_min, page, per_page
    )
    return IOCListResponse(
        iocs=[
            IOCItem(
                id=i.id,
                ioc_type=i.ioc_type,
                ioc_value=i.ioc_value,
                threat_type=i.threat_type,
                confidence=i.confidence,
                source=i.source,
                last_seen=i.last_seen,
                is_active=i.is_active,
            )
            for i in iocs
        ],
        total=total,
    )


@router.post("/iocs", status_code=201)
async def add_ioc(
    payload: IOCCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("analyst", "admin")),
):
    ioc = intelligence_service.add_ioc(
        db,
        payload.ioc_type,
        payload.ioc_value,
        payload.threat_type,
        payload.confidence,
        payload.source,
        payload.metadata,
    )
    return {"id": ioc.id, "ioc_type": ioc.ioc_type, "ioc_value": ioc.ioc_value, "created_at": ioc.created_at}
