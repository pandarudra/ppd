from app.models import Alert, SecurityEvent


def _auth_headers(client, email, password):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_dashboard_kpis(client, db):
    event = SecurityEvent(raw_log="test log line", status="processed", source_format="json")
    db.add(event)
    db.commit()
    db.refresh(event)

    alert = Alert(title="Dashboard Test Alert", severity="HIGH", status="open", event_id=event.id)
    db.add(alert)
    db.commit()

    headers = _auth_headers(client, "analyst@sentinel.local", "analyst123")
    response = client.get("/api/v1/analytics/dashboard", headers=headers)
    assert response.status_code == 200

    body = response.json()
    assert "total_events" in body
    assert "open_alerts" in body
    assert "alerts_by_severity" in body
    assert body["total_events"] >= 1
    assert body["open_alerts"] >= 1
    assert body["alerts_by_severity"].get("HIGH", 0) >= 1
