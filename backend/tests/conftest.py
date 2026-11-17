import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import redis as redis_sync
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db
from app import models  # noqa: F401  (ensures all models are registered on Base.metadata)


@pytest.fixture(scope="session", autouse=True)
def _flush_redis_rate_limits():
    # The login rate limiter (10/min/IP, plan/SECURITY_CONTROLS.md) persists
    # counters in the same dev Redis this test suite's TestClient hits, so
    # back-to-back runs (or ad hoc manual checks) within the same 60s window
    # bucket can exhaust the limit and fail unrelated tests with a 429.
    client = redis_sync.from_url(settings.REDIS_URL)
    client.flushdb()
    client.close()


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(settings.DATABASE_URL)
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db(engine):
    connection = engine.connect()
    transaction = connection.begin()
    TestSession = sessionmaker(bind=connection)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db):
    from app.main import app

    def _get_db_override():
        yield db

    app.dependency_overrides[get_db] = _get_db_override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
