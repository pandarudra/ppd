import ipaddress
import json
import re
import uuid

from jose import JWTError
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.database import SessionLocal
from app.core.security import verify_token
from app.models import Alert, Incident, SecurityEvent, User
from app.services import audit_service

AUDITED_METHODS = {"POST", "PUT", "DELETE"}

# path -> (model, uuid-or-pk lookup column). Used only to fetch the
# pre-mutation row for before_state on PUT/DELETE; GET/POST-create paths
# don't need a prior row.
RESOURCE_MODELS = {
    "alerts": (Alert, "alert_id"),
    "incidents": (Incident, "incident_id"),
    "events": (SecurityEvent, "event_id"),
    "users": (User, "id"),
}
RESOURCE_PATH_RE = re.compile(r"^/api/v1/(alerts|incidents|events|users)/([^/]+)")


def _resolve_resource(db, path: str):
    match = RESOURCE_PATH_RE.match(path)
    if not match:
        return None, None, None

    resource_type, resource_id = match.group(1), match.group(2)
    model, lookup_col = RESOURCE_MODELS[resource_type]

    # Action sub-routes (e.g. POST /events/ingest, /events/ingest/batch)
    # share this path shape but their second segment isn't a real ID --
    # validate before querying so those fall through to a no-op lookup
    # instead of a DB-level type error (UUID/int cast failure).
    row = None
    try:
        if lookup_col == "id":
            row = db.query(model).filter(model.id == int(resource_id)).first()
        else:
            uuid.UUID(resource_id)
            row = db.query(model).filter(getattr(model, lookup_col) == resource_id).first()
    except (ValueError, TypeError):
        row = None

    return resource_type, resource_id, row


def _client_ip(request: Request) -> str | None:
    if not request.client:
        return None
    try:
        ipaddress.ip_address(request.client.host)
        return request.client.host
    except ValueError:
        # e.g. TestClient's "testclient" pseudo-host, which Postgres's INET
        # column type rejects outright.
        return None


def _user_id_from_request(request: Request) -> int | None:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None
    try:
        payload = verify_token(auth_header.split(" ", 1)[1])
        return int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        return None


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method not in AUDITED_METHODS:
            return await call_next(request)

        body_bytes = await request.body()
        db = SessionLocal()
        try:
            # sync DB work goes through the threadpool: the DB is remote and a blocking
            # query here would stall every other in-flight request
            resource_type, resource_id, existing_row = await run_in_threadpool(
                _resolve_resource, db, request.url.path
            )

            before_state = None
            if request.method in ("PUT", "DELETE") and existing_row is not None:
                before_state = await run_in_threadpool(audit_service.serialize_row, existing_row)
            elif body_bytes:
                try:
                    before_state = json.loads(body_bytes)
                except json.JSONDecodeError:
                    before_state = None

            response = await call_next(request)

            response_body = b""
            async for chunk in response.body_iterator:
                response_body += chunk

            try:
                after_state = json.loads(response_body) if response_body else None
            except json.JSONDecodeError:
                after_state = None

            success = response.status_code < 400
            audit_args = (
                _user_id_from_request(request),
                f"{request.method} {request.url.path}",
                resource_type,
                resource_id,
                _client_ip(request),
                request.headers.get("user-agent"),
                before_state,
                after_state,
                success,
            )
            error_message = after_state.get("detail") if isinstance(after_state, dict) and not success else None

            def write_audit():
                # ponytail: written after the response is sent so the remote DB round trips don't
                # add ~1 s to every mutation; a crash between response and write can drop that one row.
                audit_db = SessionLocal()
                try:
                    audit_service.write_log(audit_db, *audit_args, error_message=error_message)
                finally:
                    audit_db.close()

            headers = dict(response.headers)
            headers.pop("content-length", None)
            return Response(
                content=response_body,
                status_code=response.status_code,
                headers=headers,
                media_type=response.media_type,
                background=BackgroundTask(write_audit),
            )
        finally:
            db.close()
