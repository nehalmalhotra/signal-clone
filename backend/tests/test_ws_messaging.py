import pytest
from starlette.websockets import WebSocketDisconnect

from app import config
from tests.conftest import ALICE, CARMEN, HANA, chats, login
from tests.ws_helpers import drain, of_type, recv_until, socket, token_of


def _send(ws, conv_id, client_id, body="hi"):
    ws.send_json({"type": "message.send", "conversation_id": conv_id, "client_id": client_id, "body": body})


def _receipt_status(client, headers, message_id, name):
    receipts = client.get(f"/messages/{message_id}/receipts", headers=headers).json()
    return {r["user"]["given_name"]: r["status"] for r in receipts}[name]


# --- handshake -------------------------------------------------------------------

def test_good_token_gets_ready(client, alice):
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "auth", "token": token_of(alice)})
        frame = ws.receive_json()
    assert frame["type"] == "ready" and frame["user_id"] == client.get("/me", headers=alice).json()["id"]


def test_bad_token_is_closed_with_4401(client):
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "auth", "token": "nope"})
        with pytest.raises(WebSocketDisconnect) as closed:
            ws.receive_json()
    assert closed.value.code == 4401


def test_first_frame_must_be_auth(client, alice):
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "ping"})
        with pytest.raises(WebSocketDisconnect) as closed:
            ws.receive_json()
    assert closed.value.code == 4401


def test_silent_socket_is_closed_with_4408(client, monkeypatch):
    monkeypatch.setattr(config, "WS_AUTH_TIMEOUT_S", 0.2)
    with client.websocket_connect("/ws") as ws:
        with pytest.raises(WebSocketDisconnect) as closed:
            ws.receive_json()
    assert closed.value.code == 4408


def test_logged_out_token_cannot_open_a_socket(client, alice):
    client.post("/auth/logout", headers=alice)
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "auth", "token": token_of(alice)})
        with pytest.raises(WebSocketDisconnect) as closed:
            ws.receive_json()
    assert closed.value.code == 4401


def test_idle_socket_is_dropped(client, alice, monkeypatch):
    monkeypatch.setattr(config, "WS_IDLE_TIMEOUT_S", 0.3)
    with socket(client, alice) as ws:
        with pytest.raises(WebSocketDisconnect) as closed:
            ws.receive_json()
    assert closed.value.code == 4408


# --- malformed input ---------------------------------------------------------------

def test_bad_frames_get_an_error_and_the_socket_survives(client, alice):
    with socket(client, alice) as ws:
        ws.send_text("this is not json")
        assert ws.receive_json()["code"] == "invalid_event"
        ws.send_json({"type": "message.send", "conversation_id": 1, "client_id": "c1", "body": ""})
        err = ws.receive_json()
        assert err["code"] == "invalid_event" and err["client_id"] == "c1"
        ws.send_json({"type": "no.such.event"})
        assert ws.receive_json()["code"] == "invalid_event"
        assert drain(ws) == []  # still alive and nothing else queued


def test_sending_to_a_chat_you_are_not_in_is_a_per_message_error(client, alice):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    with socket(client, login(client, HANA)) as hana:
        _send(hana, hike, "x-1")
        err = hana.receive_json()
    assert (err["type"], err["code"], err["client_id"]) == ("error", "not_found", "x-1")


# --- send -> sent -> delivered ---------------------------------------------------------

def test_send_ack_push_and_delivered(client, alice):
    carmen_h = login(client, CARMEN)
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    with socket(client, alice) as a, socket(client, carmen_h) as c:
        _send(a, chat, "k-1", "hello carmen")
        ack = recv_until(a, "message.ack")
        pushed = recv_until(c, "message.new")
        delivered = recv_until(a, "receipt.update")

    assert ack["client_id"] == "k-1" and ack["message"]["status"] == "sent"
    assert pushed["message"]["id"] == ack["message"]["id"]
    assert pushed["message"]["body"] == "hello carmen" and pushed["message"]["status"] is None
    assert (delivered["status"], delivered["message_ids"]) == ("delivered", [ack["message"]["id"]])
    assert _receipt_status(client, alice, ack["message"]["id"], "Carmen") == "delivered"
    # The REST view of the same message now shows two ticks.
    assert chats(client, alice)["Carmen Ruiz"]["last_message"]["status"] == "delivered"


def test_offline_recipient_stays_sent_then_is_caught_up_on_connect(client, alice):
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    with socket(client, alice) as a:
        _send(a, chat, "k-1")
        message_id = recv_until(a, "message.ack")["message"]["id"]
        assert of_type(drain(a), "receipt.update") == []  # Carmen is offline: one tick
        assert _receipt_status(client, alice, message_id, "Carmen") == "sent"

        with socket(client, login(client, CARMEN)):
            update = recv_until(a, "receipt.update")

    assert update["status"] == "delivered" and update["message_ids"] == [message_id]
    assert _receipt_status(client, alice, message_id, "Carmen") == "delivered"


def test_resending_the_same_client_id_acks_the_original_and_pushes_once(client, alice):
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    with socket(client, alice) as a, socket(client, login(client, CARMEN)) as c:
        _send(a, chat, "dup", "once")
        first = recv_until(a, "message.ack")
        _send(a, chat, "dup", "once")
        second = recv_until(a, "message.ack")
        drain(a)  # barrier: Alice's handler is done, so every push it made has been written
        pushes = of_type(drain(c), "message.new")
    assert first["message"]["id"] == second["message"]["id"]
    assert len(pushes) == 1


def test_lost_ack_then_retry_returns_the_same_message_without_a_second_push(client, alice, monkeypatch):
    """The server stored and pushed the message, but the ack never reached the sender's tab."""
    from app.realtime.hub import Connection
    real_send = Connection.send

    async def drop_acks(self, event):
        return False if event["type"] == "message.ack" else await real_send(self, event)
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    with socket(client, login(client, CARMEN)) as c, socket(client, alice) as a:
        monkeypatch.setattr(Connection, "send", drop_acks)
        _send(a, chat, "flaky", "did it arrive?")
        first_push = recv_until(c, "message.new")
        monkeypatch.setattr(Connection, "send", real_send)

        _send(a, chat, "flaky", "did it arrive?")  # the tab never saw an ack, so it retries
        ack = recv_until(a, "message.ack")
        drain(a)
        assert of_type(drain(c), "message.new") == []  # Carmen is not told twice

    assert ack["message"]["id"] == first_push["message"]["id"]
    page = client.get(f"/conversations/{chat}/messages", headers=alice).json()["messages"]
    assert [m["body"] for m in page].count("did it arrive?") == 1


def test_resend_after_a_lost_push_reaches_the_recipient_still_waiting(client, alice, monkeypatch):
    """Server stored the message, then died before pushing it. The retry must still reach Carmen."""
    from app.realtime.dispatcher import Dispatcher
    real_publish = Dispatcher.publish_new_message

    async def lost(self, message, origin=None):
        return None
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    with socket(client, login(client, CARMEN)) as c, socket(client, alice) as a:
        monkeypatch.setattr(Dispatcher, "publish_new_message", lost)
        _send(a, chat, "lost", "stuck")
        first = recv_until(a, "message.ack")
        assert of_type(drain(c), "message.new") == []

        monkeypatch.setattr(Dispatcher, "publish_new_message", real_publish)
        _send(a, chat, "lost", "stuck")
        recv_until(a, "message.ack")
        pushed = recv_until(c, "message.new")
        assert recv_until(a, "receipt.update")["status"] == "delivered"
        # A third attempt finds Carmen already at 'delivered' and pushes nothing more.
        _send(a, chat, "lost", "stuck")
        recv_until(a, "message.ack")
        drain(a)
        assert of_type(drain(c), "message.new") == []
    assert pushed["message"]["id"] == first["message"]["id"]


def test_rest_and_websocket_sends_share_one_idempotency_key(client, alice):
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    with socket(client, alice) as a:
        _send(a, chat, "shared", "same message")
        ws_id = recv_until(a, "message.ack")["message"]["id"]
    again = client.post(f"/conversations/{chat}/messages", json={"client_id": "shared", "body": "same message"},
                        headers=alice)
    assert (again.status_code, again.json()["id"]) == (200, ws_id)


# --- two tabs ---------------------------------------------------------------------

def test_senders_other_tab_gets_the_message_and_the_receipt(client, alice):
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    with socket(client, alice) as tab1, socket(client, alice) as tab2, socket(client, login(client, CARMEN)):
        _send(tab1, chat, "t-1", "from tab 1")
        ack = recv_until(tab1, "message.ack")
        mirrored = recv_until(tab2, "message.new")
        receipt_tab1 = recv_until(tab1, "receipt.update")
        receipt_tab2 = recv_until(tab2, "receipt.update")
        assert of_type(drain(tab1), "message.new") == []  # the origin tab got the ack, not a duplicate

    assert mirrored["message"]["id"] == ack["message"]["id"] and mirrored["message"]["status"] == "sent"
    assert receipt_tab1["message_ids"] == receipt_tab2["message_ids"] == [ack["message"]["id"]]


def test_recipient_with_two_tabs_gets_two_pushes_but_one_delivered_receipt(client, alice):
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    carmen = login(client, CARMEN)
    with socket(client, alice) as a, socket(client, carmen) as c1, socket(client, carmen) as c2:
        _send(a, chat, "t-2")
        recv_until(c1, "message.new")
        recv_until(c2, "message.new")
        recv_until(a, "receipt.update")
        assert of_type(drain(a), "receipt.update") == []  # not announced a second time


# --- read ---------------------------------------------------------------------------

def test_read_notifies_the_sender_and_syncs_the_readers_other_tab(client, alice):
    carmen_h = login(client, CARMEN)
    chat = chats(client, alice)["Carmen Ruiz"]
    last_id = chat["last_message"]["id"]
    with socket(client, carmen_h) as carmen, socket(client, alice) as tab1, socket(client, alice) as tab2:
        tab1.send_json({"type": "message.read", "conversation_id": chat["id"], "up_to_message_id": last_id})
        update = recv_until(carmen, "receipt.update", status="read")
        sync = recv_until(tab2, "read.sync")
        assert of_type(drain(tab1), "read.sync") == []  # the tab that read already knows

    assert len(update["message_ids"]) == 3  # Alice's three unread messages from Carmen
    assert sync["up_to_message_id"] == last_id
    assert chats(client, alice)["Carmen Ruiz"]["unread_count"] == 0


def test_reading_twice_pushes_nothing_the_second_time(client, alice):
    chat = chats(client, alice)["Carmen Ruiz"]
    body = {"type": "message.read", "conversation_id": chat["id"], "up_to_message_id": chat["last_message"]["id"]}
    with socket(client, login(client, CARMEN)) as carmen, socket(client, alice) as a:
        a.send_json(body)
        recv_until(carmen, "receipt.update", status="read")
        a.send_json(body)
        assert of_type(drain(a), "read.sync") == []
        assert of_type(drain(carmen), "receipt.update") == []


def test_removed_member_gets_no_pushes_for_later_messages(client, alice, ticking_clock):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    carmen_id = client.get("/users/lookup", params={"query": CARMEN}, headers=alice).json()["id"]
    with socket(client, login(client, CARMEN)) as carmen, socket(client, alice) as a:
        client.delete(f"/groups/{hike}/members/{carmen_id}", headers=alice)
        _send(a, hike, "after-removal", "Carmen can't see this")
        recv_until(a, "message.ack")
        drain(a)
        assert of_type(drain(carmen), "message.new") == []
