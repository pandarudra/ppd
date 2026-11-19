import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import httpx
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.dependencies import get_current_user
from app.models import User
from app.core.redis_client import create_redis_client
from app.middleware.audit_middleware import AuditMiddleware
from app.middleware.rate_limiter import RateLimiterMiddleware
from app.routers import alerts, analytics, assistant, auth, events, incidents, intelligence, users, websocket
from app.ws.manager import ws_manager

HEALTH_BROADCAST_INTERVAL_SECONDS = 30


def _check_db_sync() -> str:
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return "ok"
    except Exception:
        return "error"
    finally:
        db.close()


async def _check_db() -> str:
    return await run_in_threadpool(_check_db_sync)  # sync query: keep it off the event loop


async def _warm_pool(n: int = 6) -> None:
    """Open DB connections up front, in parallel: a cold connect to the remote DB takes seconds."""
    await asyncio.gather(*[run_in_threadpool(_check_db_sync) for _ in range(n)])


async def _check_ml_service() -> str:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{settings.ML_SERVICE_URL}/health")
            return "ok" if response.status_code == 200 else "error"
    except httpx.HTTPError:
        return "error"


async def _check_redis(app: FastAPI) -> str:
    try:
        return "ok" if await app.state.redis.ping() else "error"
    except Exception:
        return "error"


async def collect_health(app: FastAPI) -> dict:
    # the checks are independent and the DB/Redis are remote, so run them together
    ml, db, redis_status = await asyncio.gather(_check_ml_service(), _check_db(), _check_redis(app))
    return {
        "backend": "ok",
        "ml_service": ml,
        "db": db,
        "redis": redis_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def _broadcast_system_health(app: FastAPI):
    while True:
        await asyncio.sleep(HEALTH_BROADCAST_INTERVAL_SECONDS)
        await ws_manager.broadcast_all({"type": "system_health_update", "payload": await collect_health(app)})


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = create_redis_client()
    warm_task = asyncio.create_task(_warm_pool())  # don't block startup on it
    health_task = asyncio.create_task(_broadcast_system_health(app))
    yield
    warm_task.cancel()
    health_task.cancel()
    await app.state.redis.aclose()


app = FastAPI(title="SENTINEL Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuditMiddleware)
app.add_middleware(RateLimiterMiddleware)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(events.router)
app.include_router(alerts.router)
app.include_router(incidents.router)
app.include_router(intelligence.router)
app.include_router(assistant.router)
app.include_router(analytics.router)
app.include_router(websocket.router)


@app.get("/api/v1/system/health")
async def system_health(request: Request, current_user: User = Depends(get_current_user)):
    return await collect_health(request.app)


@app.get("/health")
async def health():
    return {"status": "ok"}
