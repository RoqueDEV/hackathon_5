import os

# Enable testing mode BEFORE importing app modules so Settings picks it up
os.environ["TESTING"] = "1"
os.environ["PSEUDONYM_SECRET"] = "test_secret_for_pytest"

import pytest
from fastapi.testclient import TestClient

# Import after env is set
import app.core.db as _db_module
from app.core.db import Base, get_db, SessionLocal

# Reuse the StaticPool in-memory SQLite engine that db.py already built
_TEST_ENGINE = _db_module.engine


def override_get_db():
    """Override DB dependency to use the same StaticPool in-memory SQLite."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=_TEST_ENGINE)
    yield
    Base.metadata.drop_all(bind=_TEST_ENGINE)


@pytest.fixture()
def client(setup_db):
    from app.main import app
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
