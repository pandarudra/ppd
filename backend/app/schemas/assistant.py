from pydantic import BaseModel, ConfigDict


class AnalyzeRequest(BaseModel):
    question: str
    context_event_ids: list[str] = []
    context_alert_ids: list[str] = []
    context_incident_id: str | None = None


class RecommendedAction(BaseModel):
    action: str
    safety: str  # "SAFE" | "NEEDS-APPROVAL"


class AnalyzeResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    analysis: str
    threat_assessment: str
    key_indicators: list[str]
    investigation_steps: list[str]
    recommended_actions: list[RecommendedAction]
    confidence_level: str
    model_used: str


class ExplainAlertResponse(BaseModel):
    alert_id: str
    explanation: str
    severity_reasoning: str
    false_positive_likelihood: str
    next_steps: list[str]


class IncidentRecommendation(BaseModel):
    priority: int
    action: str
    rationale: str
    safety: str


class RecommendResponse(BaseModel):
    incident_id: str
    recommendations: list[IncidentRecommendation]
    containment_assessment: str
