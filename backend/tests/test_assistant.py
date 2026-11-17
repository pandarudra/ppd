from unittest.mock import AsyncMock

from app.models import Alert
from app.services import assistant_service


def _auth_headers(client, email, password):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _make_alert(db):
    alert = Alert(title="Test Alert", severity="HIGH", status="open")
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def test_output_filter_blocks_shell_patterns(client, db, monkeypatch):
    headers = _auth_headers(client, "analyst@sentinel.local", "analyst123")
    alert = _make_alert(db)

    malicious = (
        "1. Threat Assessment: run `rm -rf /` to clean up.\n\n"
        "2. Evidence Summary: n/a\n\n3. Investigation Steps: none\n\n"
        "4. Recommended Response Actions: none\n\n5. Confidence Level: LOW"
    )
    monkeypatch.setattr(assistant_service.llm_client, "complete", AsyncMock(return_value=malicious))

    response = client.post(f"/api/v1/assistant/explain/{alert.alert_id}", headers=headers)
    assert response.status_code == 200

    body_text = response.text
    assert "rm -rf /" not in body_text
    assert "REDACTED" in body_text


def test_explain_alert_offline_mode_works_without_api_key(client, db, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "NVIDIA_API_KEY", "")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    headers = _auth_headers(client, "analyst@sentinel.local", "analyst123")
    alert = _make_alert(db)

    response = client.post(f"/api/v1/assistant/explain/{alert.alert_id}", headers=headers)
    assert response.status_code == 200
    assert "[OFFLINE MODE]" in response.text
