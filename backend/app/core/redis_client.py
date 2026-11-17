import redis.asyncio as redis
from fastapi import Request

from app.core.config import settings


def create_redis_client() -> redis.Redis:
    """Build a new client bound to whichever event loop is active when this runs.

    Not a module-level singleton: redis-py's asyncio connection pool pins itself
    to the event loop active at first use, which breaks across FastAPI app
    lifespans that each get their own loop (as under TestClient / pytest).
    The app creates one via this factory in its lifespan and stores it on
    app.state; see app.core.dependencies.get_redis.
    """
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def get_redis(request: Request) -> redis.Redis:
    return request.app.state.redis
