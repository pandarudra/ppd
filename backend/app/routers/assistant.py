from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User
from app.schemas.assistant import AnalyzeRequest, AnalyzeResponse, ExplainAlertResponse, RecommendResponse
from app.services import assistant_service

router = APIRouter(prefix="/api/v1/assistant", tags=["assistant"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    payload: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert_id = payload.context_alert_ids[0] if payload.context_alert_ids else None
    result = await assistant_service.analyze(
        db, payload.question, alert_id, payload.context_incident_id, payload.context_event_ids
    )
    return result


@router.post("/explain/{alert_id}", response_model=ExplainAlertResponse)
async def explain_alert(
    alert_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    result = await assistant_service.explain_alert(db, alert_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return result


@router.post("/recommend/{incident_id}", response_model=RecommendResponse)
async def recommend(
    incident_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    result = await assistant_service.recommend_for_incident(db, incident_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return result
