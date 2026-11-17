import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from main import app

SAMPLE_FEATURES = {
    "duration": 0.5,
    "src_port": 54321,
    "dst_port": 22,
    "protocol_enc": 0,
    "packet_size_avg": 80,
    "bytes_sent": 2000,
    "bytes_recv": 50,
    "packet_count": 300,
    "failed_auth_ratio": 0.9,
    "port_entropy": 0.8,
    "syn_count": 120,
    "unique_dst_ports": 20,
    "conn_rate": 45,
    "ttl_avg": 48,
    "is_private_src": 0,
    "is_private_dst": 1,
}


def test_predict_returns_valid_schema():
    with TestClient(app) as client:
        response = client.post("/predict", json={"features": SAMPLE_FEATURES})

    assert response.status_code == 200
    body = response.json()

    for key in ("prediction", "confidence_score", "risk_level", "anomaly_score", "model_scores"):
        assert key in body

    assert 0.0 <= body["confidence_score"] <= 1.0

    for model in ("isolation_forest", "random_forest", "xgboost"):
        assert model in body["model_scores"]
