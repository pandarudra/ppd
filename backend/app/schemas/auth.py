from pydantic import BaseModel

from app.schemas.common import Email
from app.schemas.user import UserPublic


class LoginRequest(BaseModel):
    email: Email
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    expires_in: int
    # Extends the documented API spec response with the rotated refresh token
    # (SECURITY_CONTROLS.md requires rotate-on-refresh; the client needs the
    # new value to keep authenticating after the old one is revoked).
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class MessageResponse(BaseModel):
    message: str
