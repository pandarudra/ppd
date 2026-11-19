from app.services.analytics_service import _stage, _worst
from app.services.geo import locate


def test_locate_is_deterministic_and_skips_private():
    assert locate("203.0.113.50") is None or locate("203.0.113.50") == locate("203.0.113.50")
    assert locate("45.155.205.9") == locate("45.155.205.9")
    assert locate("45.155.205.9")["country"]
    assert locate("10.0.0.5") is None
    assert locate("garbage") is None


def test_stage_keywords_and_severity_order():
    assert _stage("Port Scan Detected") == "recon"
    assert _stage("Ssh Login Failed Detected") == "brute_force"
    assert _stage("Data Exfil") == "exfiltration"
    assert _stage("???") == "other"
    assert _worst("LOW", "CRITICAL") == "CRITICAL"


def test_signature_rules_raise_but_never_lower():
    from types import SimpleNamespace

    from app.services import rules

    ev = SimpleNamespace(event_type="phishing_link_clicked_credential_harvest")
    low = {"prediction": "normal", "risk_level": "LOW", "confidence_score": 0.3, "model_scores": {"xgboost": 0.1}}
    out = rules.apply(low, ev, {})
    assert out["risk_level"] == "HIGH" and out["prediction"] == "malicious"
    assert out["model_scores"]["signature_rules"] and out["model_scores"]["xgboost"] == 0.1

    crit = {"prediction": "malicious", "risk_level": "CRITICAL", "confidence_score": 0.99}
    assert rules.apply(crit, ev, {}) is crit  # ML already higher: untouched
    benign = SimpleNamespace(event_type="network_connection")
    assert rules.apply(low, benign, {"syn_count": 2}) is low
    assert rules.evaluate(benign, {"syn_count": 9000})[1] == "CRITICAL"
