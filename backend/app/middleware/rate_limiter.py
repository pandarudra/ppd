import time

from jose import JWTError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.security import verify_token

# exact path -> (limit, window_seconds). Values per plan/SECURITY_CONTROLS.md
# "API Rate Limiting".
PATH_LIMITS = {
    "/api/v1/auth/login": (10, 60),
    "/api/v1/events/ingest": (1000, 60),
    "/api/v1/events/ingest/batch": (1000, 60),
}
# path-prefix -> (limit, window_seconds), for routes with a dynamic segment
# (e.g. /assistant/explain/{alert_id}) that a plain dict key can't match.
PATH_PREFIX_LIMITS = [
    ("/api/v1/assistant/", 20, 60),
]
DEFAULT_LIMIT = (200, 60)


def _limit_for(path: str) -> tuple[int, int]:
    if path in PATH_LIMITS:
        return PATH_LIMITS[path]
    for prefix, limit, window in PATH_PREFIX_LIMITS:
        if path.startswith(prefix):
            return (limit, window)
    return DEFAULT_LIMIT


class RateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        limit, window = _limit_for(path)

        key_id = request.client.host if request.client else "unknown"
        auth_header = request.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            try:
                payload = verify_token(auth_header.split(" ", 1)[1])
                key_id = f"user:{payload.get('sub')}"
            except JWTError:
                pass

        window_bucket = int(time.time() // window)
        redis_key = f"ratelimit:{path}:{key_id}:{window_bucket}"

        redis_client = request.app.state.redis
        # one round trip instead of two (Redis is remote)
        async with redis_client.pipeline(transaction=False) as pipe:
            pipe.incr(redis_key)
            pipe.expire(redis_key, window)
            count, _ = await pipe.execute()

        if count > limit:
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded", "detail": "Too many requests", "code": 429},
            )

        return await call_next(request)
