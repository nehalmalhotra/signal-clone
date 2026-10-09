import pytest
from fastapi.testclient import TestClient

import app.main

OTP = "123456"

# Seeded phone numbers (app/db/seed_data.py).
ALICE, BOB, CARMEN, DEV, EMMA, FARAH, GEORGE, HANA = (f"+120255501{i:02d}" for i in range(8))


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


def chats(client, headers):
    """The chat list keyed by title, e.g. chats(...)["Book Club"]."""
    return {c["title"]: c for c in client.get("/conversations", headers=headers).json()}


def user_id(client, headers, phone):
    return client.get("/users/lookup", params={"query": phone}, headers=headers).json()["id"]


@pytest.fixture
def ticking_clock(monkeypatch):
    """Every now_ms() call returns a later time, so 'before' and 'after' never share a millisecond."""
    from app import clock
    t = {"now": clock.now_ms()}

    def tick():
        t["now"] += 1
        return t["now"]
    monkeypatch.setattr(clock, "now_ms", tick)
