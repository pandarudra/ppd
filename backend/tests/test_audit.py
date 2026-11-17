from app.core.database import SessionLocal
from app.models import Alert, AuditLog


def _auth_headers(client, email, password):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_audit_log_written_on_mutation(client, db):
    headers = _auth_headers(client, "analyst@sentinel.local", "analyst123")

    alert = Alert(title="Audit Test Alert", severity="HIGH", status="open")
    db.add(alert)
    db.commit()
    db.refresh(alert)
    alert_uuid = str(alert.alert_id)

    response = client.put(
        f"/api/v1/alerts/{alert_uuid}/status",
        json={"status": "acknowledged", "note": "checking into it"},
        headers=headers,
    )
    assert response.status_code == 200

    # AuditMiddleware opens its own DB session/connection (a real background
    # task would too), separate from the test's rollback-wrapped `db` fixture
    # -- query through that same separate connection rather than `db`.
    verify_db = SessionLocal()
    try:
        log = (
            verify_db.query(AuditLog)
            .filter(AuditLog.resource_type == "alerts", AuditLog.resource_id == alert_uuid)
            .order_by(AuditLog.timestamp.desc())
            .first()
        )
        assert log is not None
        assert log.before_state is not None
        assert log.after_state is not None
        assert log.success is True
    finally:
        verify_db.query(AuditLog).filter(AuditLog.resource_type == "alerts", AuditLog.resource_id == alert_uuid).delete()
        verify_db.commit()
        verify_db.close()
