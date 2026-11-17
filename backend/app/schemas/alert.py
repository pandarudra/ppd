from datetime import datetime

from pydantic import BaseModel


class EventSummary(BaseModel):
    event_id: str
    source_ip: str | None = None
    dest_port: int | None = None


class DetectionSummary(BaseModel):
    confidence_score: float
    risk_level: str | None = None


class AssigneeSummary(BaseModel):
    id: int
    full_name: str


class AlertListItem(BaseModel):
    id: int
    alert_id: str
    title: str
    severity: str
    status: str
    confidence_score: float | None = None
    source_ip: str | None = None
    created_at: datetime
    assigned_to: AssigneeSummary | None = None


class AlertListResponse(BaseModel):
    alerts: list[AlertListItem]
    total: int
    page: int
    per_page: int


class AlertDetail(BaseModel):
    id: int
    alert_id: str
    title: str
    description: str | None = None
    severity: str
    status: str
    event: EventSummary | None = None
    detection: DetectionSummary | None = None
    assigned_to: AssigneeSummary | None = None
    tags: list[str] = []
    created_at: datetime


class AlertStatusUpdate(BaseModel):
    status: str
    note: str | None = None


class AlertAssignRequest(BaseModel):
    assign_to_user_id: int


class AlertCommentRequest(BaseModel):
    comment: str


class CorrelateRequest(BaseModel):
    alert_ids: list[str]
    correlation_key: str | None = None


class CorrelateResponse(BaseModel):
    group_id: str
    title: str
    alert_count: int
    severity: str
