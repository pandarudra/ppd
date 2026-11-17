import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.redis_client import create_redis_client
from app.middleware.audit_middleware import AuditMiddleware
from app.middleware.rate_limiter import RateLimiterMiddleware
from app.routers import alerts, analytics, assistant, auth, events, incidents, intelligence, users, websocket
from app.ws.manager import ws_manager

HEALTH_BROADCAST_INTERVAL_SECONDS = 30


async def _check_db() -> str:
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return "ok"
    except Exception:
        return "error"
    finally:
        db.close()


async def _check_ml_service() -> str:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{settings.ML_SERVICE_URL}/health")
            return "ok" if response.status_code == 200 else "error"
    except httpx.HTTPError:
        return "error"


async def _broadcast_system_health(app: FastAPI):
    while True:
        await asyncio.sleep(HEALTH_BROADCAST_INTERVAL_SECONDS)
        try:
            redis_status = "ok" if await app.state.redis.ping() else "error"
        except Exception:
            redis_status = "error"

        await ws_manager.broadcast_all(
            {
                "type": "system_health_update",
                "payload": {
                    "backend": "ok",
                    "ml_service": await _check_ml_service(),
                    "db": await _check_db(),
                    "redis": redis_status,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            }
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = create_redis_client()
    health_task = asyncio.create_task(_broadcast_system_health(app))
    yield
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


@app.get("/health")
async def health():
    return {"status": "ok"}
