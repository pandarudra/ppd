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
