import re

from sqlalchemy.orm import Session

from app.llm import llm_client
from app.llm.prompt_templates import build_analysis_prompt
from app.models import Alert, DetectionResult, Incident, SecurityEvent
from app.services import alert_service, event_service, incident_service, intelligence_service

SECTION_PATTERN = re.compile(
    r"\d+\.\s*(Threat Assessment|Evidence Summary|Investigation Steps|"
    r"Recommended Response Actions|Confidence Level)[:\s]*(.*?)(?=\n\s*\d+\.\s*[A-Z]|\Z)",
    re.IGNORECASE | re.DOTALL,
)


def _parse_sections(text: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    for match in SECTION_PATTERN.finditer(text):
        key = match.group(1).strip().lower().replace(" ", "_")
        sections[key] = match.group(2).strip()
    return sections


def _split_to_list(text: str | None) -> list[str]:
    if not text:
        return []
    lines = []
    for raw_line in text.splitlines():
        line = raw_line.strip().lstrip("-*").strip()
        line = re.sub(r"^\d+[\.\)]\s*", "", line)
        if line:
            lines.append(line)
    return lines


def _parse_recommended_actions(text: str | None) -> list[dict]:
    actions = []
    for line in _split_to_list(text):
        safety = "NEEDS-APPROVAL" if "NEEDS-APPROVAL" in line.upper() else "SAFE"
        action_text = re.sub(r"\(?\s*(SAFE|NEEDS-APPROVAL)\s*\)?", "", line, flags=re.IGNORECASE).strip(" :-")
        actions.append({"action": action_text or line, "safety": safety})
    return actions


def gather_context(
    db: Session,
    alert_id: str | None = None,
    incident_id: str | None = None,
    event_ids: list[str] | None = None,
) -> dict:
    context: dict = {
        "alert": None,
        "detection": None,
        "event": None,
        "ti_matches": [],
        "similar_incidents": [],
        "recent_alerts": [],
    }

    alert = alert_service.get_alert_by_uuid(db, alert_id) if alert_id else None
    event = None
    detection = None

    if alert:
        context["alert"] = {
            "alert_id": str(alert.alert_id),
            "title": alert.title,
            "severity": alert.severity,
            "status": alert.status,
        }
        event = db.query(SecurityEvent).filter(SecurityEvent.id == alert.event_id).first()
        detection = (
            db.query(DetectionResult)
            .filter(DetectionResult.id == alert.detection_result_id)
            .first()
        )

    if not event and event_ids:
        event = event_service.get_event_by_uuid(db, event_ids[0])

    if event:
        context["event"] = {
            "event_id": str(event.event_id),
            "source_ip": event.source_ip,
            "dest_ip": event.dest_ip,
            "event_type": event.event_type,
            "normalized_data": event.normalized_data,
        }
        if event.source_ip:
            ti = intelligence_service.lookup(db, event.source_ip, "IP")
            if ti:
                context["ti_matches"].append(
                    {"ioc_value": ti.ioc_value, "threat_type": ti.threat_type, "confidence": ti.confidence}
                )

    if detection:
        context["detection"] = {
            "prediction_label": detection.prediction_label,
            "confidence_score": detection.confidence_score,
            "risk_level": detection.risk_level,
            "model_scores": detection.model_scores,
        }

    incident = incident_service.get_incident_by_uuid(db, incident_id) if incident_id else None

    if not (alert or event or incident):
        # Nothing pinned: give the model the platform's recent activity so general
        # questions ("summarize recent alerts") have something to work from.
        rows = (
            db.query(Alert, SecurityEvent.source_ip, SecurityEvent.dest_ip, SecurityEvent.dest_port)
            .outerjoin(SecurityEvent, SecurityEvent.id == Alert.event_id)
            .order_by(Alert.created_at.desc())
            .limit(15)
            .all()
        )
        context["recent_alerts"] = [
            {"title": a.title, "severity": a.severity, "status": a.status, "source_ip": src,
             "dest_ip": dst, "dest_port": port, "created_at": a.created_at.isoformat()}
            for a, src, dst, port in rows
        ]

    if incident:
        # No real similarity search in this MVP slice; approximate "similar
        # past incidents" with the most recent incidents of the same
        # severity, excluding this one.
        similar = (
            db.query(Incident)
            .filter(Incident.severity == incident.severity, Incident.id != incident.id)
            .order_by(Incident.created_at.desc())
            .limit(3)
            .all()
        )
        context["similar_incidents"] = [
            {"incident_id": str(i.incident_id), "title": i.title, "status": i.status} for i in similar
        ]

    return context, incident


async def analyze(db: Session, question: str, alert_id: str | None, incident_id: str | None, event_ids: list[str]) -> dict:
    question = llm_client.cap_question_length(question)
    context, incident = gather_context(db, alert_id, incident_id, event_ids)

    prompt = build_analysis_prompt(question, context)
    raw_response = llm_client.filter_output(await llm_client.complete(prompt))
    sections = _parse_sections(raw_response)

    if incident:
        incident_service.log_history(
            db, incident.id, None, "ai_analysis", f"AI analysis requested: {question[:200]}"
        )

    return {
        "analysis": raw_response,
        "threat_assessment": sections.get("threat_assessment", ""),
        "key_indicators": _split_to_list(sections.get("evidence_summary")),
        "investigation_steps": _split_to_list(sections.get("investigation_steps")),
        "recommended_actions": _parse_recommended_actions(sections.get("recommended_response_actions")),
        "confidence_level": sections.get("confidence_level", "LOW").split()[0].upper()
        if sections.get("confidence_level")
        else "LOW",
        "model_used": "offline" if raw_response.startswith("[OFFLINE MODE]") else "nvidia/gemini",
    }


async def explain_alert(db: Session, alert_id: str) -> dict | None:
    alert = alert_service.get_alert_by_uuid(db, alert_id)
    if alert is None:
        return None

    context, _ = gather_context(db, alert_id=alert_id)
    question = "Explain why this alert was triggered and whether it's likely a false positive."
    prompt = build_analysis_prompt(question, context)
    raw_response = llm_client.filter_output(await llm_client.complete(prompt))
    sections = _parse_sections(raw_response)
    is_offline = raw_response.startswith("[OFFLINE MODE]")

    return {
        "alert_id": alert_id,
        "explanation": raw_response if is_offline else (sections.get("threat_assessment") or raw_response),
        "severity_reasoning": sections.get("evidence_summary", ""),
        "false_positive_likelihood": sections.get("confidence_level", "UNKNOWN"),
        "next_steps": _split_to_list(sections.get("investigation_steps")),
    }


async def recommend_for_incident(db: Session, incident_id: str) -> dict | None:
    incident = incident_service.get_incident_by_uuid(db, incident_id)
    if incident is None:
        return None

    context, _ = gather_context(db, incident_id=incident_id)
    question = "What response actions do you recommend for this incident, in priority order?"
    prompt = build_analysis_prompt(question, context)
    raw_response = llm_client.filter_output(await llm_client.complete(prompt))
    sections = _parse_sections(raw_response)

    actions = _parse_recommended_actions(sections.get("recommended_response_actions"))
    recommendations = [
        {"priority": i + 1, "action": a["action"], "rationale": sections.get("threat_assessment", ""), "safety": a["safety"]}
        for i, a in enumerate(actions)
    ]

    incident_service.log_history(
        db, incident.id, None, "ai_analysis", "AI recommendations generated"
    )

    return {
        "incident_id": incident_id,
        "recommendations": recommendations,
        "containment_assessment": sections.get("threat_assessment", raw_response),
    }
