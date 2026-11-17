import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import Email


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_uuid: uuid.UUID
    email: Email
    full_name: str
    role: str
    is_active: bool
    last_login: datetime | None = None
    created_at: datetime


class UserCreate(BaseModel):
    email: Email
    password: str
    full_name: str
    role: str = "analyst"


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None


class UserListResponse(BaseModel):
    users: list[UserPublic]
    total: int
    page: int
    per_page: int
    pages: int
