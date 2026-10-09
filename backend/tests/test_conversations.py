from tests.conftest import DEV, HANA, chats, login, user_id


def test_chat_list_is_sorted_by_latest_activity(client, alice):
    titles = list(chats(client, alice))
    assert titles == ["Bob Okafor", "Carmen Ruiz", "Weekend Hike", "Book Club", "Dev Patel", "Emma"]


def test_unread_counts_match_the_seed(client, alice):
    unread = {t: c["unread_count"] for t, c in chats(client, alice).items()}
    assert unread == {"Bob Okafor": 0, "Carmen Ruiz": 3, "Weekend Hike": 0, "Book Club": 2,
                      "Dev Patel": 0, "Emma": 0}


def test_last_message_preview_and_bubble_status(client, alice):
    c = chats(client, alice)
    assert c["Bob Okafor"]["last_message"]["body"] == "Never mind, found mine 😅"
    assert c["Bob Okafor"]["last_message"]["status"] == "sent"   # Bob never received it
    assert c["Dev Patel"]["last_message"]["status"] == "read"
    assert c["Weekend Hike"]["last_message"]["status"] == "read"  # best of Bob/Carmen/Dev
    assert c["Carmen Ruiz"]["last_message"]["status"] is None     # not Alice's message


def test_direct_chat_shows_the_other_person(client, alice):
    bob = chats(client, alice)["Bob Okafor"]
    assert bob["type"] == "direct" and bob["peer"]["given_name"] == "Bob"
    assert "phone_number" not in bob["peer"]
    hike = chats(client, alice)["Weekend Hike"]
    assert hike["peer"] is None and hike["member_count"] == 4


def test_removed_member_sees_group_read_only_with_no_unread(client):
    dev = login(client, DEV)
    club = chats(client, dev)["Book Club"]
    assert club["is_member"] is False and club["unread_count"] == 0
    assert club["member_count"] == 4  # Farah, Alice, George, Emma
    # The newest thing Dev can see is his own removal, not the chat after it.
    assert club["last_message"]["kind"] == "group_update"
    assert club["last_message"]["meta"]["action"] == "member_removed"


def test_direct_chat_get_or_create(client, alice):
    hana = user_id(client, alice, HANA)
    first = client.post("/conversations/direct", json={"user_id": hana}, headers=alice)
    again = client.post("/conversations/direct", json={"user_id": hana}, headers=alice)
    assert (first.status_code, again.status_code) == (201, 200)
    assert first.json()["id"] == again.json()["id"]
    # Hana sees the same chat from her side.
    assert chats(client, login(client, HANA))["Alice Chen"]["id"] == first.json()["id"]


def test_direct_chat_with_self_or_unknown_user(client, alice):
    me = client.get("/me", headers=alice).json()["id"]
    assert client.post("/conversations/direct", json={"user_id": me}, headers=alice).status_code == 400
    assert client.post("/conversations/direct", json={"user_id": 999}, headers=alice).status_code == 404


def test_outsider_gets_404_not_403(client, alice):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    hana = login(client, HANA)
    assert client.get(f"/conversations/{hike}", headers=hana).status_code == 404
    assert client.get(f"/conversations/{hike}/messages", headers=hana).status_code == 404
    assert client.get("/conversations/9999", headers=alice).status_code == 404


def test_detail_lists_active_members_and_my_role(client, alice):
    c = chats(client, alice)
    hike = client.get(f"/conversations/{c['Weekend Hike']['id']}", headers=alice).json()
    assert hike["my_role"] == "admin"
    assert [m["user"]["given_name"] for m in hike["members"]] == ["Alice", "Bob", "Carmen", "Dev"]
    club = client.get(f"/conversations/{c['Book Club']['id']}", headers=alice).json()
    assert club["my_role"] == "member"
    assert "Dev" not in [m["user"]["given_name"] for m in club["members"]]  # removed -> not listed


def test_conversations_need_auth(client):
    assert client.get("/conversations").status_code == 401
