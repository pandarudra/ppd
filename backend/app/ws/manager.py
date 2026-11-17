from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, ws: WebSocket, user_id: int, role: str) -> None:
        await ws.accept()
        self.active_connections.setdefault(role, []).append(ws)

    def disconnect(self, ws: WebSocket, role: str) -> None:
        connections = self.active_connections.get(role, [])
        if ws in connections:
            connections.remove(ws)

    async def broadcast_to_role(self, role: str, message: dict) -> None:
        dead = []
        for ws in self.active_connections.get(role, []):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, role)

    async def broadcast_all(self, message: dict) -> None:
        for role in list(self.active_connections.keys()):
            await self.broadcast_to_role(role, message)


ws_manager = WebSocketManager()
