from tests.conftest import BOB, EMMA, HANA


def test_lookup_by_phone_and_username_hides_phone_number(client, alice):
    by_phone = client.get("/users/lookup", params={"query": EMMA}, headers=alice)
    assert by_phone.json()["given_name"] == "Emma"
    assert "phone_number" not in by_phone.json()
    by_name = client.get("/users/lookup", params={"query": "BOBOKAFOR.11"}, headers=alice)
    assert by_name.json()["given_name"] == "Bob"
    assert client.get("/users/lookup", params={"query": "+19990000000"}, headers=alice).status_code == 404
    assert client.get("/users/lookup", params={"query": "bob"}, headers=alice).status_code == 404  # exact only


def test_contacts_are_per_user_and_sorted(client, alice):
    names = [c["given_name"] for c in client.get("/contacts", headers=alice).json()]
    assert names == sorted(names, key=str.lower) and "Bob" in names and "Hana" not in names


def test_add_contact_is_idempotent(client, alice):
    hana = client.get("/users/lookup", params={"query": HANA}, headers=alice).json()["id"]
    first = client.post("/contacts", json={"user_id": hana}, headers=alice)
    again = client.post("/contacts", json={"user_id": hana}, headers=alice)
    assert (first.status_code, again.status_code) == (201, 200)
    names = [c["given_name"] for c in client.get("/contacts", headers=alice).json()]
    assert names.count("Hana") == 1


def test_cannot_add_self_or_unknown_user(client, alice):
    me = client.get("/me", headers=alice).json()["id"]
    assert client.post("/contacts", json={"user_id": me}, headers=alice).status_code == 400
    assert client.post("/contacts", json={"user_id": 9999}, headers=alice).status_code == 404


def test_contacts_need_auth(client):
    assert client.get("/contacts").status_code == 401
    assert client.get("/users/lookup", params={"query": BOB}).status_code == 401
