import httpx
import redis.asyncio as redis
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.redis_client import get_redis
from app.models import User
from app.services import analytics_service

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/dashboard")
async def dashboard(
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    return await analytics_service.get_dashboard(db, redis_client)


@router.get("/trends")
def trends(
    period: str = "7d",
    metric: str = "alert_volume",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return analytics_service.get_trends(db, period, metric)


@router.get("/models")
async def models(current_user: User = Depends(get_current_user)):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{settings.ML_SERVICE_URL}/models")
            r.raise_for_status()
            return r.json()
    except httpx.HTTPError:
        return {"models": {}}


@router.get("/top-sources")
def top_sources(hours: int = 24, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"sources": analytics_service.get_top_sources(db, hours)}


@router.get("/top-targets")
def top_targets(hours: int = 24, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"targets": analytics_service.get_top_targets(db, hours)}


@router.get("/attack-paths")
def attack_paths(hours: int = 24, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return analytics_service.get_attack_paths(db, hours)


@router.get("/geo")
def geo(hours: int = 24, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return analytics_service.get_geo(db, hours)
