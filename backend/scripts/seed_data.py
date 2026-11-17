"""Seed admin/analyst users, sample threat intel, and placeholder ML model rows."""
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from passlib.context import CryptContext

from app.core.database import SessionLocal
from app.models import MLModel, ThreatIntelligence, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

SAMPLE_IOCS = [
    ("IP", "1.2.3.4", "C2", 95, "OTX"),
    ("IP", "203.0.113.50", "scanner", 80, "AbuseIPDB"),
    ("DOMAIN", "malicious-example.net", "phishing", 90, "manual"),
    ("HASH", "d41d8cd98f00b204e9800998ecf8427e", "malware", 70, "manual"),
    ("URL", "http://evil-example.test/payload", "malware", 85, "manual"),
]

PLACEHOLDER_MODELS = [
    ("isolation_forest", "1.0", "IsolationForest", "models/isolation_forest.joblib"),
    ("random_forest", "1.0", "RandomForest", "models/random_forest.joblib"),
    ("xgboost", "1.0", "XGBoost", "models/xgboost_model.joblib"),
]


def seed(db):
    if not db.query(User).filter_by(email="admin@sentinel.local").first():
        db.add(
            User(
                email="admin@sentinel.local",
                password_hash=pwd_context.hash("admin123"),
                full_name="Admin User",
                role="admin",
            )
        )
    if not db.query(User).filter_by(email="analyst@sentinel.local").first():
        db.add(
            User(
                email="analyst@sentinel.local",
                password_hash=pwd_context.hash("analyst123"),
                full_name="Jane Smith",
                role="analyst",
            )
        )

    for ioc_type, ioc_value, threat_type, confidence, source in SAMPLE_IOCS:
        if not db.query(ThreatIntelligence).filter_by(ioc_type=ioc_type, ioc_value=ioc_value).first():
            db.add(
                ThreatIntelligence(
                    ioc_type=ioc_type,
                    ioc_value=ioc_value,
                    threat_type=threat_type,
                    confidence=confidence,
                    source=source,
                    first_seen=datetime.now(timezone.utc),
                    last_seen=datetime.now(timezone.utc),
                )
            )

    for model_name, model_version, algorithm, model_path in PLACEHOLDER_MODELS:
        if not db.query(MLModel).filter_by(model_name=model_name, model_version=model_version).first():
            db.add(
                MLModel(
                    model_name=model_name,
                    model_version=model_version,
                    algorithm=algorithm,
                    model_path=model_path,
                    is_active=False,
                )
            )

    db.commit()


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed(db)
        print("Seed complete.")
    finally:
        db.close()
