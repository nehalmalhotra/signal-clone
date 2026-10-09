"""REST writes must reach open sockets exactly like WebSocket writes do."""

from tests.conftest import BOB, CARMEN, DEV, HANA, chats, login, user_id
from tests.ws_helpers import drain, of_type, recv_until, socket


def _rest_send(client, headers, conv_id, client_id="r-1", body="via REST"):
    return client.post(f"/conversations/{conv_id}/messages", json={"client_id": client_id, "body": body},
                       headers=headers)


def test_rest_send_is_pushed_to_the_recipient_and_marked_delivered(client, alice):
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    with socket(client, alice) as a, socket(client, login(client, CARMEN)) as c:
        r = _rest_send(client, alice, chat)
        pushed = recv_until(c, "message.new")
        delivered = recv_until(a, "receipt.update")
    assert r.status_code == 201
    assert pushed["message"]["id"] == r.json()["id"] and pushed["message"]["status"] is None
    assert (delivered["status"], delivered["message_ids"]) == ("delivered", [r.json()["id"]])


def test_rest_send_to_an_offline_recipient_stays_sent_until_they_connect(client, alice):
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    with socket(client, alice) as a:
        message = _rest_send(client, alice, chat).json()
        assert of_type(drain(a), "receipt.update") == []
        with socket(client, login(client, CARMEN)):
            update = recv_until(a, "receipt.update")
    assert update["message_ids"] == [message["id"]] and update["status"] == "delivered"


def test_rest_retry_returns_200_and_does_not_push_twice(client, alice):
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    with socket(client, login(client, CARMEN)) as c:
        first = _rest_send(client, alice, chat)
        again = _rest_send(client, alice, chat)
        # REST handlers await their pushes before answering, so everything is already written.
        pushes = of_type(drain(c), "message.new")
    assert (first.status_code, again.status_code) == (201, 200)
    assert len(pushes) == 1


def test_rest_read_notifies_the_sender_and_the_readers_tabs(client, alice):
    chat = chats(client, alice)["Carmen Ruiz"]
    with socket(client, login(client, CARMEN)) as carmen, socket(client, alice) as a:
        r = client.post(f"/conversations/{chat['id']}/read",
                        json={"up_to_message_id": chat["last_message"]["id"]}, headers=alice)
        update = recv_until(carmen, "receipt.update", status="read")
        sync = recv_until(a, "read.sync")
    assert r.json() == {"updated": 3} and len(update["message_ids"]) == 3
    assert sync["up_to_message_id"] == chat["last_message"]["id"]


def test_a_failing_push_never_turns_a_committed_write_into_an_error(client, alice, monkeypatch):
    from app.realtime.dispatcher import Dispatcher

    async def boom(self, message, origin=None):
        raise RuntimeError("socket layer exploded")
    monkeypatch.setattr(Dispatcher, "publish_new_message", boom)
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    r = _rest_send(client, alice, chat)
    assert r.status_code == 201
    page = client.get(f"/conversations/{chat}/messages", headers=alice).json()["messages"]
    assert page[-1]["id"] == r.json()["id"]


def test_an_unexpected_error_in_a_handler_keeps_the_socket_open(client, alice, monkeypatch):
    from app.realtime.dispatcher import Dispatcher

    async def boom(self, *args, **kwargs):
        raise RuntimeError("bug")
    monkeypatch.setattr(Dispatcher, "send_message", boom)
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    with socket(client, alice) as a:
        a.send_json({"type": "message.send", "conversation_id": chat, "client_id": "k", "body": "x"})
        err = recv_until(a, "error")
        assert (err["code"], err["client_id"]) == ("internal", "k")
        assert drain(a) == []  # still connected


# --- groups ------------------------------------------------------------------------

def test_adding_a_member_notifies_everyone_and_the_newcomer_then_gets_live_messages(client, alice):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    hana = user_id(client, alice, HANA)
    with socket(client, login(client, HANA)) as h, socket(client, login(client, BOB)) as b:
        client.post(f"/groups/{hike}/members", json={"user_ids": [hana]}, headers=alice)
        assert recv_until(h, "conversation.updated")["conversation_id"] == hike
        assert recv_until(b, "conversation.updated")["conversation_id"] == hike
        _rest_send(client, alice, hike, "after-add", "welcome Hana")
        assert recv_until(h, "message.new")["message"]["body"] == "welcome Hana"


def test_removing_a_member_tells_them_and_the_rest_and_stops_live_messages(client, alice, ticking_clock):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    carmen_id = user_id(client, alice, CARMEN)
    with socket(client, login(client, CARMEN)) as c, socket(client, login(client, DEV)) as d:
        client.delete(f"/groups/{hike}/members/{carmen_id}", headers=alice)
        assert recv_until(c, "conversation.updated")["conversation_id"] == hike  # the removed person is told
        assert recv_until(d, "conversation.updated")["conversation_id"] == hike
        _rest_send(client, alice, hike, "post-removal", "Carmen is gone")
        recv_until(d, "message.new")
        assert of_type(drain(c), "message.new") == []


def test_creating_a_group_and_changing_roles_are_pushed(client, alice):
    bob_id = user_id(client, alice, BOB)
    with socket(client, login(client, BOB)) as b:
        group = client.post("/groups", json={"name": "Cats", "member_ids": [bob_id]}, headers=alice).json()
        assert recv_until(b, "conversation.updated")["conversation_id"] == group["id"]
        client.patch(f"/groups/{group['id']}/members/{bob_id}", json={"role": "admin"}, headers=alice)
        assert recv_until(b, "conversation.updated")["conversation_id"] == group["id"]


def test_a_rejected_group_change_pushes_nothing(client, alice):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    bob_h = login(client, BOB)
    with socket(client, alice) as a:
        r = client.post(f"/groups/{hike}/members", json={"user_ids": [user_id(client, alice, HANA)]}, headers=bob_h)
        assert r.status_code == 403
        assert of_type(drain(a), "conversation.updated") == []
