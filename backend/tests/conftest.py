import pytest
from fastapi.testclient import TestClient

import app.main

OTP = "123456"

# Seeded phone numbers (app/db/seed_data.py).
ALICE, BOB, CARMEN, DEV, EMMA, FARAH, GEORGE, HANA = (f"+1555010{i}" for i in range(8))


@pytest.fixture
def client(tmp_path, monkeypatch):
    """The real app on a throwaway, freshly seeded DB and media folder."""
    monkeypatch.setattr(app.main, "DATABASE_PATH", tmp_path / "api.db")
    monkeypatch.setattr(app.main, "MEDIA_DIR", tmp_path / "media")
    with TestClient(app.main.app) as c:
        yield c


def login(client, phone):
    """Log in as a seeded user; returns the Authorization header dict."""
    body = client.post("/auth/verify", json={"phone_number": phone, "code": OTP}).json()
    return {"Authorization": f"Bearer {body['token']}"}


@pytest.fixture
def alice(client):
    return login(client, ALICE)


@pytest.fixture
def bob(client):
    return login(client, BOB)
