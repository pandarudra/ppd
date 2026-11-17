from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class EventIngestSchema(BaseModel):
    raw_log: str
    source_format: str | None = None
    metadata: dict[str, Any] | None = None


class BatchIngestSchema(BaseModel):
    events: list[EventIngestSchema]
    batch_id: str | None = None


class IngestAcceptedResponse(BaseModel):
    status: str = "accepted"
    event_id: str
    message: str = "Event queued for ML processing"


class BatchIngestResponse(BaseModel):
    status: str = "accepted"
    batch_id: str | None = None
    accepted_count: int
    rejected_count: int
    event_ids: list[str]


class DetectionSummary(BaseModel):
    prediction: str | None = None
    confidence_score: float | None = None
    risk_level: str | None = None


class EventStatusResponse(BaseModel):
    event_id: str
    status: str
    ingested_at: datetime
    detection_result: DetectionSummary | None = None


class EventListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: str
    source_ip: str | None = None
    dest_ip: str | None = None
    dest_port: int | None = None
    protocol: str | None = None
    event_type: str | None = None
    status: str
    ingested_at: datetime
    detection_summary: DetectionSummary | None = None


class EventListResponse(BaseModel):
    events: list[EventListItem]
    total: int
    page: int
    per_page: int


class EventDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: str
    source_ip: str | None = None
    dest_ip: str | None = None
    source_port: int | None = None
    dest_port: int | None = None
    protocol: str | None = None
    event_type: str | None = None
    raw_log: str
    normalized_data: dict[str, Any] | None = None
    event_timestamp: datetime | None = None
    ingested_at: datetime
    status: str
    source_format: str | None = None


class DetectionDetailResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    event_id: str
    model_name: str
    prediction_label: str
    confidence_score: float
    risk_level: str | None = None
    anomaly_score: float | None = None
    model_scores: dict[str, Any] | None = None
    feature_values: dict[str, Any] | None = None
    processed_at: datetime
