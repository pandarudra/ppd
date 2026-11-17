from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.redis_client import create_redis_client
from app.middleware.rate_limiter import RateLimiterMiddleware
from app.routers import auth, events, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = create_redis_client()
    yield
    await app.state.redis.aclose()


app = FastAPI(title="SENTINEL Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimiterMiddleware)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(events.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
