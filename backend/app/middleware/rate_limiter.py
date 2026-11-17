import time

from jose import JWTError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.security import verify_token

# path -> (limit, window_seconds); unlisted paths fall back to DEFAULT_LIMIT.
# Values per plan/SECURITY_CONTROLS.md "API Rate Limiting".
PATH_LIMITS = {
    "/api/v1/auth/login": (10, 60),
    "/api/v1/events/ingest": (1000, 60),
    "/api/v1/events/ingest/batch": (1000, 60),
    "/api/v1/assistant/analyze": (20, 60),
}
DEFAULT_LIMIT = (200, 60)


class RateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        limit, window = PATH_LIMITS.get(path, DEFAULT_LIMIT)

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
        count = await redis_client.incr(redis_key)
        if count == 1:
            await redis_client.expire(redis_key, window)

        if count > limit:
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded", "detail": "Too many requests", "code": 429},
            )

        return await call_next(request)
