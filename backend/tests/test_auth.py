from tests.conftest import ALICE, OTP, login

NEW = "+15559990000"


def test_request_code_rejects_malformed_number(client):
    assert client.post("/auth/request-code", json={"phone_number": "12345"}).status_code == 422
    assert client.post("/auth/request-code", json={"phone_number": ALICE}).json() == {"code_sent": True}


def test_wrong_code_is_rejected(client):
    r = client.post("/auth/verify", json={"phone_number": ALICE, "code": "000000"})
    assert r.status_code == 400


def test_existing_user_logs_in_and_token_works(client):
    r = client.post("/auth/verify", json={"phone_number": ALICE, "code": OTP})
    body = r.json()
    assert body["status"] == "logged_in" and body["user"]["given_name"] == "Alice"
    me = client.get("/me", headers={"Authorization": f"Bearer {body['token']}"})
    assert me.status_code == 200 and me.json()["phone_number"] == ALICE


def test_new_number_must_register_then_gets_a_working_token(client):
    r = client.post("/auth/verify", json={"phone_number": NEW, "code": OTP})
    assert r.json() == {"status": "profile_required"}

    r = client.post("/auth/register", json={"phone_number": NEW, "code": OTP, "given_name": " Nova "})
    assert r.status_code == 201
    assert r.json()["user"]["given_name"] == "Nova"
    headers = {"Authorization": f"Bearer {r.json()['token']}"}
    assert client.get("/me", headers=headers).json()["phone_number"] == NEW

    # Now the same number logs in instead of registering.
    assert client.post("/auth/verify", json={"phone_number": NEW, "code": OTP}).json()["status"] == "logged_in"


def test_register_checks_code_and_rejects_duplicates(client):
    bad = client.post("/auth/register", json={"phone_number": NEW, "code": "1", "given_name": "X"})
    assert bad.status_code == 400
    dup = client.post("/auth/register", json={"phone_number": ALICE, "code": OTP, "given_name": "X"})
    assert dup.status_code == 409
    blank = client.post("/auth/register", json={"phone_number": NEW, "code": OTP, "given_name": "  "})
    assert blank.status_code == 400


def test_missing_or_garbage_token_is_401(client):
    assert client.get("/me").status_code == 401
    r = client.get("/me", headers={"Authorization": "Bearer nope"})
    assert r.status_code == 401 and r.headers["www-authenticate"] == "Bearer"


def test_logout_kills_only_that_session(client):
    first, second = login(client, ALICE), login(client, ALICE)
    assert client.post("/auth/logout", headers=first).status_code == 204
    assert client.get("/me", headers=first).status_code == 401
    assert client.get("/me", headers=second).status_code == 200


def test_only_a_hash_of_the_token_is_stored(client):
    headers = login(client, ALICE)
    token = headers["Authorization"].split()[1]
    from app.db.connection import get_connection
    conn = get_connection(client.app.state.db_path)
    stored = [r["token_hash"] for r in conn.execute("SELECT token_hash FROM sessions")]
    conn.close()
    assert token not in stored and len(stored[-1]) == 64


def test_idle_session_expires_after_30_days(client, monkeypatch):
    from app import clock
    headers = login(client, ALICE)
    real_now = clock.now_ms()
    monkeypatch.setattr(clock, "now_ms", lambda: real_now + 31 * 24 * 3600 * 1000)
    assert client.get("/me", headers=headers).status_code == 401
