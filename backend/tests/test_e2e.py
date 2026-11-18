"""plan/ROADMAP.md §12.1 Scenario 1 -- Full Detection Pipeline.

Uses a plain TestClient (no get_db override) rather than the conftest
`client`/`db` fixtures: the background task that scores the event opens its
own SessionLocal(), a separate connection from whatever session `get_db`
would be overridden to -- under the fixtures' rollback-wrapped transaction,
that background session can never see the just-ingested, not-really-committed
event (see Task 6/9 ledger entries for the same pattern). A real TestClient,
where every request gets its own genuinely-committing session, matches how
the deployed stack behaves and is what an integration test should exercise.
"""
import time

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.database import SessionLocal
from app.main import app

HIGH_RISK_RAW_LOG = (
    "Nov 17 09:00:00 firewall kernel: DROP IN=eth0 SRC=198.51.100.23 "
    "DST=10.0.0.5 PROTO=TCP DPT=22"
)


def _login(client, email, password):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


def test_full_scenario_1_detection_pipeline():
    with TestClient(app) as client:
        token = _login(client, "analyst@sentinel.local", "analyst123")
        headers = {"Authorization": f"Bearer {token}"}

        event_id = None
        alert_id = None
        try:
            with client.websocket_connect(f"/ws?token={token}") as ws:
                ingest_response = client.post(
                    "/api/v1/events/ingest",
                    json={"raw_log": HIGH_RISK_RAW_LOG, "source_format": "syslog"},
                    headers=headers,
                )
                assert ingest_response.status_code == 202
                event_id = ingest_response.json()["event_id"]

                status_body = None
                for _ in range(20):
                    status_response = client.get(
                        f"/api/v1/events/status/{event_id}", headers=headers
                    )
                    status_body = status_response.json()
                    if status_body["status"] == "processed":
                        break
                    time.sleep(0.25)

                assert status_body["status"] == "processed"
                assert status_body["detection_result"]["risk_level"] in ("HIGH", "CRITICAL")

                ws_message = ws.receive_json()
                assert ws_message["type"] == "new_alert"
                assert ws_message["payload"]["severity"] in ("HIGH", "CRITICAL")
                alert_id = ws_message["payload"]["alert_id"]

            alert_detail = client.get(f"/api/v1/alerts/{alert_id}", headers=headers)
            assert alert_detail.status_code == 200
            assert alert_detail.json()["severity"] in ("HIGH", "CRITICAL")

            ack_response = client.put(
                f"/api/v1/alerts/{alert_id}/status",
                json={"status": "acknowledged"},
                headers=headers,
            )
            assert ack_response.status_code == 200
            assert ack_response.json()["status"] == "acknowledged"
        finally:
            cleanup_db = SessionLocal()
            if alert_id:
                cleanup_db.execute(text("DELETE FROM alerts WHERE alert_id = :id"), {"id": alert_id})
            if event_id:
                cleanup_db.execute(
                    text("DELETE FROM detection_results WHERE event_id IN "
                         "(SELECT id FROM security_events WHERE event_id = :id)"),
                    {"id": event_id},
                )
                cleanup_db.execute(
                    text("DELETE FROM security_events WHERE event_id = :id"), {"id": event_id}
                )
            cleanup_db.commit()
            cleanup_db.close()
