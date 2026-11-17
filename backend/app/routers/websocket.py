from datetime import datetime, timezone

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError

from app.core.database import SessionLocal
from app.core.security import verify_token
from app.models import User
from app.ws.manager import ws_manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str | None = Query(default=None)):
    if not token:
        await websocket.close(code=1008)
        return

    try:
        payload = verify_token(token)
    except JWTError:
        await websocket.close(code=1008)
        return

    if payload.get("type") != "access":
        await websocket.close(code=1008)
        return

    jti = payload.get("jti")
    if jti and await websocket.app.state.redis.get(f"blacklist:{jti}"):
        await websocket.close(code=1008)
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == int(payload.get("sub"))).first()
    finally:
        db.close()

    if user is None or not user.is_active:
        await websocket.close(code=1008)
        return

    await ws_manager.connect(websocket, user.id, user.role)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json(
                    {"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()}
                )
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user.role)
