from tests.conftest import BOB, DEV, HANA, chats, login


def test_history_pages_oldest_first_and_stitch_together(client, alice):
    cid = chats(client, alice)["Bob Okafor"]["id"]
    newest = client.get(f"/conversations/{cid}/messages", params={"limit": 10}, headers=alice).json()
    ids = [m["id"] for m in newest["messages"]]
    assert len(ids) == 10 and ids == sorted(ids) and newest["has_more"] is True

    older = client.get(f"/conversations/{cid}/messages",
                       params={"limit": 100, "before_id": ids[0]}, headers=alice).json()
    assert len(older["messages"]) == 15 and older["has_more"] is False  # 25 seeded in total
    assert older["messages"][-1]["id"] < ids[0]


def test_send_creates_sent_receipts_for_every_other_member(client, alice):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    r = client.post(f"/conversations/{hike}/messages",
                    json={"client_id": "c-1", "body": "  Leaving at 7  "}, headers=alice)
    assert r.status_code == 201
    msg = r.json()
    assert msg["body"] == "Leaving at 7" and msg["status"] == "sent"
    receipts = client.get(f"/messages/{msg['id']}/receipts", headers=alice).json()
    assert {x["user"]["given_name"]: x["status"] for x in receipts} == {
        "Bob": "sent", "Carmen": "sent", "Dev": "sent"}
    # It becomes the chat's latest message.
    assert chats(client, alice)["Weekend Hike"]["last_message"]["id"] == msg["id"]


def test_resending_same_client_id_returns_the_original(client, alice):
    cid = chats(client, alice)["Dev Patel"]["id"]
    body = {"client_id": "retry-me", "body": "hello"}
    first = client.post(f"/conversations/{cid}/messages", json=body, headers=alice)
    again = client.post(f"/conversations/{cid}/messages", json=body, headers=alice)
    assert (first.status_code, again.status_code) == (201, 200)
    assert first.json()["id"] == again.json()["id"]
    page = client.get(f"/conversations/{cid}/messages", headers=alice).json()["messages"]
    assert [m["body"] for m in page].count("hello") == 1


def test_client_id_cannot_jump_to_another_conversation(client, alice):
    c = chats(client, alice)
    client.post(f"/conversations/{c['Dev Patel']['id']}/messages",
                json={"client_id": "same", "body": "a"}, headers=alice)
    r = client.post(f"/conversations/{c['Emma']['id']}/messages",
                    json={"client_id": "same", "body": "a"}, headers=alice)
    assert r.status_code == 409


def test_blank_body_is_rejected(client, alice):
    cid = chats(client, alice)["Dev Patel"]["id"]
    assert client.post(f"/conversations/{cid}/messages", json={"client_id": "x", "body": "   "},
                       headers=alice).status_code == 400
    assert client.post(f"/conversations/{cid}/messages", json={"client_id": "x", "body": ""},
                       headers=alice).status_code == 422


def test_outsider_cannot_send(client, alice):
    cid = chats(client, alice)["Dev Patel"]["id"]
    hana = login(client, HANA)
    r = client.post(f"/conversations/{cid}/messages", json={"client_id": "x", "body": "hi"}, headers=hana)
    assert r.status_code == 404


def test_mark_read_clears_unread_and_upgrades_the_senders_bubble(client, alice):
    bob = login(client, BOB)
    chat = chats(client, bob)["Alice Chen"]
    assert chat["unread_count"] == 3
    r = client.post(f"/conversations/{chat['id']}/read",
                    json={"up_to_message_id": chat["last_message"]["id"]}, headers=bob)
    assert r.json() == {"updated": 3}
    assert chats(client, bob)["Alice Chen"]["unread_count"] == 0
    assert chats(client, alice)["Bob Okafor"]["last_message"]["status"] == "read"
    # Doing it again changes nothing.
    again = client.post(f"/conversations/{chat['id']}/read",
                        json={"up_to_message_id": chat["last_message"]["id"]}, headers=bob)
    assert again.json() == {"updated": 0}


def test_mark_read_respects_the_upper_bound(client, alice):
    chat = chats(client, alice)["Carmen Ruiz"]
    page = client.get(f"/conversations/{chat['id']}/messages", headers=alice).json()["messages"]
    third_from_end = page[-3]["id"]  # Carmen's three unread are the last three
    r = client.post(f"/conversations/{chat['id']}/read", json={"up_to_message_id": third_from_end},
                    headers=alice)
    assert r.json() == {"updated": 1}
    assert chats(client, alice)["Carmen Ruiz"]["unread_count"] == 2


def test_receipts_are_visible_to_the_sender_only(client, alice):
    hike = chats(client, alice)["Weekend Hike"]
    last = hike["last_message"]["id"]
    info = client.get(f"/messages/{last}/receipts", headers=alice).json()
    assert {x["user"]["given_name"]: x["status"] for x in info} == {
        "Bob": "read", "Carmen": "read", "Dev": "delivered"}  # the Info-view demo from the seed
    assert client.get(f"/messages/{last}/receipts", headers=login(client, BOB)).status_code == 403
    assert client.get(f"/messages/{last}/receipts", headers=login(client, HANA)).status_code == 404
    assert client.get("/messages/99999/receipts", headers=alice).status_code == 404


def test_removed_member_reads_history_up_to_removal_but_cannot_send(client):
    dev = login(client, DEV)
    club = chats(client, dev)["Book Club"]["id"]
    page = client.get(f"/conversations/{club}/messages", headers=dev).json()["messages"]
    assert page[-1]["meta"]["action"] == "member_removed"
    assert "Meeting Thursday 7pm at mine? I'll make tea" not in [m["body"] for m in page]
    r = client.post(f"/conversations/{club}/messages", json={"client_id": "x", "body": "hi"}, headers=dev)
    assert r.status_code == 403
