from datetime import datetime

from pydantic import BaseModel


class IOCLookupResponse(BaseModel):
    ioc_value: str
    ioc_type: str
    found: bool
    threat_type: str | None = None
    confidence: int | None = None
    source: str | None = None
    last_seen: datetime | None = None
    is_active: bool | None = None


class IOCCreate(BaseModel):
    ioc_type: str
    ioc_value: str
    threat_type: str | None = None
    confidence: int = 50
    source: str | None = None
    metadata: dict | None = None


class IOCItem(BaseModel):
    id: int
    ioc_type: str
    ioc_value: str
    threat_type: str | None = None
    confidence: int
    source: str | None = None
    last_seen: datetime | None = None
    is_active: bool


class IOCListResponse(BaseModel):
    iocs: list[IOCItem]
    total: int
