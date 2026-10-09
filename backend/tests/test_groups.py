from tests.conftest import BOB, CARMEN, HANA, chats, login, user_id


def _ids(client, headers, *phones):
    return [user_id(client, headers, p) for p in phones]


def _names(detail):
    return [m["user"]["given_name"] for m in detail["members"]]


def test_create_group_makes_creator_admin_and_writes_timeline(client, alice):
    r = client.post("/groups", json={"name": " Cats ", "member_ids": _ids(client, alice, BOB, HANA)},
                    headers=alice)
    assert r.status_code == 201
    group = r.json()
    assert group["title"] == "Cats" and group["my_role"] == "admin"
    assert sorted(_names(group)) == ["Alice", "Bob", "Hana"]
    page = client.get(f"/conversations/{group['id']}/messages", headers=alice).json()["messages"]
    assert [m["meta"]["action"] for m in page] == ["group_created", "member_added"]
    # Everyone invited sees it in their chat list.
    assert "Cats" in chats(client, login(client, HANA))


def test_create_group_validation(client, alice):
    bob = _ids(client, alice, BOB)
    assert client.post("/groups", json={"name": "x" * 33, "member_ids": bob}, headers=alice).status_code == 422
    assert client.post("/groups", json={"name": "  ", "member_ids": bob}, headers=alice).status_code == 400
    me = client.get("/me", headers=alice).json()["id"]
    assert client.post("/groups", json={"name": "Solo", "member_ids": [me]}, headers=alice).status_code == 400
    assert client.post("/groups", json={"name": "Ghost", "member_ids": [999]}, headers=alice).status_code == 404


def test_only_admins_can_add_remove_or_change_roles(client, alice):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    bob, hana = login(client, BOB), user_id(client, alice, HANA)
    carmen = user_id(client, alice, CARMEN)
    assert client.post(f"/groups/{hike}/members", json={"user_ids": [hana]}, headers=bob).status_code == 403
    assert client.delete(f"/groups/{hike}/members/{carmen}", headers=bob).status_code == 403
    assert client.patch(f"/groups/{hike}/members/{carmen}", json={"role": "admin"}, headers=bob).status_code == 403
    # Book Club: Alice is only a member there.
    club = chats(client, alice)["Book Club"]["id"]
    assert client.post(f"/groups/{club}/members", json={"user_ids": [hana]}, headers=alice).status_code == 403


def test_admin_adds_member_and_it_is_logged(client, alice):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    hana = user_id(client, alice, HANA)
    r = client.post(f"/groups/{hike}/members", json={"user_ids": [hana, hana]}, headers=alice)
    assert "Hana" in _names(r.json()) and r.json()["member_count"] == 5
    last = chats(client, alice)["Weekend Hike"]["last_message"]
    assert last["meta"] == {"action": "member_added", "target_ids": [hana]}
    # Adding someone already inside changes nothing and adds no new timeline entry.
    client.post(f"/groups/{hike}/members", json={"user_ids": [hana]}, headers=alice)
    assert chats(client, alice)["Weekend Hike"]["last_message"]["id"] == last["id"]


def test_removed_member_keeps_history_loses_sending_and_can_be_re_added(client, alice, ticking_clock):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    carmen_h, carmen = login(client, CARMEN), user_id(client, alice, CARMEN)

    assert client.delete(f"/groups/{hike}/members/{carmen}", headers=alice).status_code == 204
    client.post(f"/conversations/{hike}/messages", json={"client_id": "after", "body": "after"}, headers=alice)

    seen = client.get(f"/conversations/{hike}/messages", headers=carmen_h).json()["messages"]
    assert seen[-1]["meta"]["action"] == "member_removed"  # her last visible line is her own removal
    assert "after" not in [m["body"] for m in seen]
    assert chats(client, carmen_h)["Weekend Hike"]["is_member"] is False
    assert client.post(f"/conversations/{hike}/messages", json={"client_id": "z", "body": "hi"},
                       headers=carmen_h).status_code == 403

    # Re-adding: same membership row comes back to life, as a plain member.
    r = client.post(f"/groups/{hike}/members", json={"user_ids": [carmen]}, headers=alice)
    assert "Carmen" in _names(r.json())
    assert chats(client, carmen_h)["Weekend Hike"]["is_member"] is True
    sent = client.post(f"/conversations/{hike}/messages", json={"client_id": "back", "body": "back!"},
                       headers=carmen_h)
    assert sent.status_code == 201


def test_member_can_leave_but_last_admin_cannot_abandon_others(client, alice):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    bob_h = login(client, BOB)
    bob, me = user_id(client, alice, BOB), client.get("/me", headers=alice).json()["id"]

    assert client.delete(f"/groups/{hike}/members/{bob}", headers=bob_h).status_code == 204  # leave
    assert chats(client, alice)["Weekend Hike"]["last_message"]["meta"] == {"action": "member_left"}

    r = client.delete(f"/groups/{hike}/members/{me}", headers=alice)  # Alice is the only admin
    assert r.status_code == 409


def test_role_changes_and_the_last_admin_rule(client, alice):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    bob_h, bob = login(client, BOB), user_id(client, alice, BOB)
    me = client.get("/me", headers=alice).json()["id"]

    assert client.patch(f"/groups/{hike}/members/{me}", json={"role": "member"}, headers=alice).status_code == 409
    r = client.patch(f"/groups/{hike}/members/{bob}", json={"role": "admin"}, headers=alice)
    assert r.status_code == 200 and r.json()["members"][1]["role"] == "admin"
    # Bob can now use admin powers, and Alice can step down.
    assert client.post(f"/groups/{hike}/members", json={"user_ids": [user_id(client, alice, HANA)]},
                       headers=bob_h).status_code == 200
    assert client.patch(f"/groups/{hike}/members/{me}", json={"role": "member"}, headers=alice).status_code == 200
    assert client.get(f"/conversations/{hike}", headers=alice).json()["my_role"] == "member"


def test_group_endpoints_reject_direct_chats_and_unknown_targets(client, alice):
    direct = chats(client, alice)["Bob Okafor"]["id"]
    hike = chats(client, alice)["Weekend Hike"]["id"]
    assert client.post(f"/groups/{direct}/members", json={"user_ids": [1]}, headers=alice).status_code == 404
    assert client.delete(f"/groups/{hike}/members/{user_id(client, alice, HANA)}", headers=alice).status_code == 404
