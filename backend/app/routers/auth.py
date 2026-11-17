import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, oauth2_scheme
from app.core.redis_client import get_redis
from app.core.security import verify_token
from app.models import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RefreshResponse,
    TokenResponse,
)
from app.schemas.user import UserPublic
from app.services import auth_service

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    try:
        result = await auth_service.authenticate(db, redis_client, payload.email, payload.password)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    return result


@router.post("/logout", response_model=MessageResponse)
async def logout(
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    payload = verify_token(token)
    await auth_service.logout(redis_client, payload["jti"], payload["exp"])
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(
    payload: RefreshRequest,
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    try:
        result = await auth_service.refresh_access_token(db, redis_client, payload.refresh_token)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    return result


@router.get("/me", response_model=UserPublic)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/change-password", response_model=MessageResponse)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        auth_service.change_password(db, current_user, payload.current_password, payload.new_password)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    return {"message": "Password changed successfully"}
