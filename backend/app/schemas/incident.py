from datetime import datetime

from pydantic import BaseModel


class UserRef(BaseModel):
    id: int
    full_name: str


class IncidentCreate(BaseModel):
    title: str
    description: str | None = None
    severity: str
    alert_ids: list[str] = []


class IncidentUpdate(BaseModel):
    status: str | None = None
    severity: str | None = None
    assigned_to: int | None = None
    mitigation_notes: str | None = None
    summary: str | None = None


class IncidentListItem(BaseModel):
    id: int
    incident_id: str
    title: str
    status: str
    severity: str
    assigned_to: str | None = None
    alert_count: int
    created_at: datetime


class IncidentListResponse(BaseModel):
    incidents: list[IncidentListItem]
    total: int
    page: int
    per_page: int


class LinkedAlertSummary(BaseModel):
    alert_id: str
    title: str
    severity: str
    source_ip: str | None = None
    dest_ip: str | None = None


class IncidentDetail(BaseModel):
    incident_id: str
    title: str
    description: str | None = None
    status: str
    severity: str
    created_by: UserRef | None = None
    assigned_to: UserRef | None = None
    linked_alerts: list[LinkedAlertSummary]
    created_at: datetime
    updated_at: datetime


class LinkAlertsRequest(BaseModel):
    alert_ids: list[str]


class TimelineEntry(BaseModel):
    id: int
    action_type: str
    description: str
    user: str | None = None
    created_at: datetime


class TimelineResponse(BaseModel):
    incident_id: str
    timeline: list[TimelineEntry]


class ResponseActionCreate(BaseModel):
    action_type: str
    action_description: str


class ResponseActionDecision(BaseModel):
    decision: str  # "approve" | "reject"
    rejection_reason: str | None = None
