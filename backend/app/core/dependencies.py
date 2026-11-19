import time

import redis.asyncio as redis
from fastapi import Depends, HTTPException, Request, status
from starlette.concurrency import run_in_threadpool
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis_client import get_redis
from app.core.security import verify_token
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials"
)


# ponytail: per-process user cache, GET requests only (writes always re-read so mutated rows stay
# attached to the request's session). Deactivation/role changes take up to _USER_TTL seconds to apply;
# the Redis token blacklist is still checked on every request.
_USER_TTL = 30
_user_cache: dict[int, tuple[float, User]] = {}


def _load_user(db: Session, user_id: int, cacheable: bool) -> User | None:
    hit = _user_cache.get(user_id) if cacheable else None
    if hit and hit[0] > time.monotonic():
        return hit[1]
    user = db.query(User).filter(User.id == user_id).first()
    if user is not None and cacheable:
        db.expunge(user)
        _user_cache[user_id] = (time.monotonic() + _USER_TTL, user)
    return user


async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
) -> User:
    try:
        payload = verify_token(token)
    except JWTError:
        raise CREDENTIALS_EXCEPTION

    if payload.get("type") != "access":
        raise CREDENTIALS_EXCEPTION

    jti = payload.get("jti")
    if jti and await redis_client.get(f"blacklist:{jti}"):
        raise CREDENTIALS_EXCEPTION

    user_id = payload.get("sub")
    if user_id is None:
        raise CREDENTIALS_EXCEPTION

    user = await run_in_threadpool(_load_user, db, int(user_id), request.method == "GET")
    if user is None or not user.is_active:
        raise CREDENTIALS_EXCEPTION

    return user


def require_role(*roles: str):
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
            )
        return current_user

    return checker
