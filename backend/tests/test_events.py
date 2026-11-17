def _auth_headers(client, email, password):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_ingest_syslog_event(client):
    headers = _auth_headers(client, "analyst@sentinel.local", "analyst123")
    response = client.post(
        "/api/v1/events/ingest",
        json={
            "raw_log": "Nov 15 10:23:45 firewall kernel: DROP IN=eth0 SRC=192.168.1.100 DST=10.0.0.5 PROTO=TCP DPT=22",
            "source_format": "syslog",
        },
        headers=headers,
    )
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "accepted"
    assert "event_id" in body

    status_response = client.get(f"/api/v1/events/status/{body['event_id']}", headers=headers)
    assert status_response.status_code == 200
    assert status_response.json()["event_id"] == body["event_id"]


def test_ingest_malformed_log_does_not_500(client):
    headers = _auth_headers(client, "analyst@sentinel.local", "analyst123")
    response = client.post(
        "/api/v1/events/ingest",
        json={"raw_log": "this is not a recognizable log format at all !!##"},
        headers=headers,
    )
    assert response.status_code == 202
    event_id = response.json()["event_id"]

    detail_response = client.get(f"/api/v1/events/{event_id}", headers=headers)
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["status"] == "pending"
    assert detail["source_format"] == "unknown"
    assert detail["source_ip"] is None
    assert detail["event_type"] is None
