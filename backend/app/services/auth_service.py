from datetime import datetime, timedelta, timezone

import redis.asyncio as redis
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_token,
)
from app.models import User

LOCK_THRESHOLD = 5
LOCK_MINUTES = 15


class AuthError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def _refresh_ttl_seconds() -> int:
    return settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400


async def authenticate(db: Session, redis_client: redis.Redis, email: str, password: str) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise AuthError(401, "Invalid email or password")

    now = datetime.now(timezone.utc)
    if user.locked_until and user.locked_until > now:
        raise AuthError(403, "Account locked due to too many failed attempts. Try again later.")

    if not verify_password(password, user.password_hash):
        user.failed_attempts += 1
        if user.failed_attempts >= LOCK_THRESHOLD:
            user.locked_until = now + timedelta(minutes=LOCK_MINUTES)
        db.commit()
        raise AuthError(401, "Invalid email or password")

    user.failed_attempts = 0
    user.locked_until = None
    user.last_login = now
    db.commit()
    db.refresh(user)

    access_token, _ = create_access_token(user.id, user.role)
    refresh_token, refresh_jti = create_refresh_token(user.id)
    await redis_client.set(f"refresh:{user.id}", refresh_jti, ex=_refresh_ttl_seconds())

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user,
    }


async def logout(redis_client: redis.Redis, jti: str, exp_timestamp: int) -> None:
    remaining = exp_timestamp - int(datetime.now(timezone.utc).timestamp())
    if remaining > 0:
        await redis_client.set(f"blacklist:{jti}", "1", ex=remaining)


async def refresh_access_token(db: Session, redis_client: redis.Redis, refresh_token: str) -> dict:
    try:
        payload = verify_token(refresh_token)
    except JWTError:
        raise AuthError(401, "Invalid refresh token")

    if payload.get("type") != "refresh":
        raise AuthError(401, "Invalid refresh token")

    user_id = int(payload["sub"])
    jti = payload["jti"]

    stored_jti = await redis_client.get(f"refresh:{user_id}")
    if stored_jti != jti:
        raise AuthError(401, "Refresh token revoked or expired")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise AuthError(401, "User not found")

    access_token, _ = create_access_token(user.id, user.role)
    new_refresh_token, new_jti = create_refresh_token(user.id)
    await redis_client.set(f"refresh:{user_id}", new_jti, ex=_refresh_ttl_seconds())

    return {
        "access_token": access_token,
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "refresh_token": new_refresh_token,
    }


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.password_hash):
        raise AuthError(400, "Current password is incorrect")
    user.password_hash = hash_password(new_password)
    db.commit()
