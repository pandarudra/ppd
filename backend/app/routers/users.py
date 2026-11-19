import math

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.security import hash_password
from app.models import User
from app.schemas.user import UserCreate, UserListResponse, UserPublic, UserUpdate

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("", response_model=UserListResponse, dependencies=[Depends(require_role("admin"))])
def list_users(
    role: str | None = None,
    is_active: bool | None = None,
    page: int = 1,
    per_page: int = 25,
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    total = query.count()
    users = query.offset((page - 1) * per_page).limit(per_page).all()
    pages = math.ceil(total / per_page) if per_page else 0

    return {"users": users, "total": total, "page": page, "per_page": per_page, "pages": pages}


@router.post(
    "", response_model=UserPublic, status_code=201, dependencies=[Depends(require_role("admin"))]
)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserPublic)
def get_user(
    user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put(
    "/{user_id}", response_model=UserPublic, dependencies=[Depends(require_role("admin"))]
)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user
