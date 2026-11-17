from app.models import Alert


def _auth_headers(client, email, password):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _make_alert(db, title="Test Alert", severity="HIGH"):
    alert = Alert(title=title, severity=severity, status="open")
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def test_incident_lifecycle(client, db):
    headers = _auth_headers(client, "analyst@sentinel.local", "analyst123")
    alert1 = _make_alert(db, "Alert One")
    alert2 = _make_alert(db, "Alert Two")

    create_response = client.post(
        "/api/v1/incidents",
        json={
            "title": "Suspicious Campaign",
            "description": "Two related alerts",
            "severity": "HIGH",
            "alert_ids": [str(alert1.alert_id), str(alert2.alert_id)],
        },
        headers=headers,
    )
    assert create_response.status_code == 201
    incident_id = create_response.json()["incident_id"]

    timeline_response = client.get(f"/api/v1/incidents/{incident_id}/timeline", headers=headers)
    assert timeline_response.status_code == 200
    action_types = [entry["action_type"] for entry in timeline_response.json()["timeline"]]
    assert "note_added" in action_types

    update_response = client.put(
        f"/api/v1/incidents/{incident_id}", json={"status": "investigating"}, headers=headers
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "investigating"

    timeline_response_2 = client.get(f"/api/v1/incidents/{incident_id}/timeline", headers=headers)
    action_types_2 = [entry["action_type"] for entry in timeline_response_2.json()["timeline"]]
    assert "status_changed" in action_types_2

    detail = client.get(f"/api/v1/incidents/{incident_id}", headers=headers)
    assert detail.status_code == 200
    assert len(detail.json()["linked_alerts"]) == 2


def test_two_person_approval_rejected(client, db):
    admin_headers = _auth_headers(client, "admin@sentinel.local", "admin123")
    analyst_headers = _auth_headers(client, "analyst@sentinel.local", "analyst123")

    create_response = client.post(
        "/api/v1/incidents",
        json={"title": "Containment Needed", "severity": "HIGH", "alert_ids": []},
        headers=admin_headers,
    )
    incident_id = create_response.json()["incident_id"]

    request_response = client.post(
        f"/api/v1/incidents/{incident_id}/response-actions",
        json={"action_type": "block_ip", "action_description": "Block 203.0.113.50"},
        headers=admin_headers,
    )
    assert request_response.status_code == 201
    action_id = request_response.json()["action_id"]

    self_approve = client.put(
        f"/api/v1/incidents/{incident_id}/response-actions/{action_id}",
        json={"decision": "approve"},
        headers=admin_headers,
    )
    assert self_approve.status_code == 400

    other_approve = client.put(
        f"/api/v1/incidents/{incident_id}/response-actions/{action_id}",
        json={"decision": "approve"},
        headers=analyst_headers,
    )
    assert other_approve.status_code == 200
    assert other_approve.json()["status"] == "approved"

    timeline = client.get(f"/api/v1/incidents/{incident_id}/timeline", headers=admin_headers)
    users_in_timeline = {entry["user"] for entry in timeline.json()["timeline"]}
    assert "Admin User" in users_in_timeline
    assert "Jane Smith" in users_in_timeline
