from app import config
from app.db.connection import get_connection
from tests.conftest import ALICE, BOB, CARMEN, DEV, HANA, chats, login
from tests.ws_helpers import drain, of_type, recv_until, socket


def _typing(ws, conv_id, is_typing=True):
    ws.send_json({"type": "typing", "conversation_id": conv_id, "typing": is_typing})


def _last_seen(client, phone):
    conn = get_connection(client.app.state.db_path)
    try:
        return conn.execute("SELECT last_seen_at FROM users WHERE phone_number = ?", (phone,)).fetchone()[0]
    finally:
        conn.close()


def _set_last_seen(client, phone, value):
    conn = get_connection(client.app.state.db_path)
    with conn:
        conn.execute("UPDATE users SET last_seen_at = ? WHERE phone_number = ?", (value, phone))
    conn.close()


# --- typing ----------------------------------------------------------------------------

def test_typing_reaches_the_other_person_but_not_the_typists_own_tabs(client, alice):
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    with socket(client, alice) as tab1, socket(client, alice) as tab2, socket(client, login(client, CARMEN)) as c:
        _typing(tab1, chat)
        frame = recv_until(c, "typing")
        assert of_type(drain(tab1), "typing") == [] and of_type(drain(tab2), "typing") == []
    me = client.get("/me", headers=alice).json()["id"]
    assert frame == {"type": "typing", "conversation_id": chat, "user_id": me, "typing": True}


def test_typing_in_a_group_reaches_every_other_member(client, alice):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    with socket(client, alice) as a, socket(client, login(client, BOB)) as b, socket(client, login(client, CARMEN)) as c:
        _typing(a, hike)
        assert recv_until(b, "typing")["typing"] is True
        assert recv_until(c, "typing")["typing"] is True
        assert of_type(drain(a), "typing") == []


def test_repeated_started_frames_are_throttled_but_stopped_never_is(client, alice):
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    with socket(client, alice) as a, socket(client, login(client, CARMEN)) as c:
        for _ in range(5):
            _typing(a, chat, True)  # a client stuck in a loop
        _typing(a, chat, False)
        _typing(a, chat, True)  # new burst right after "stopped" is allowed
        drain(a)  # barrier: everything above has been processed
        states = [f["typing"] for f in of_type(drain(c), "typing")]
    assert states == [True, False, True]


def test_started_is_relayed_again_once_the_interval_has_passed(client, alice, monkeypatch):
    monkeypatch.setattr(config, "TYPING_MIN_INTERVAL_S", 0)
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    with socket(client, alice) as a, socket(client, login(client, CARMEN)) as c:
        _typing(a, chat)
        _typing(a, chat)
        drain(a)
        assert len(of_type(drain(c), "typing")) == 2


def test_outsiders_and_removed_members_cannot_type_into_a_chat(client, alice, ticking_clock):
    hike = chats(client, alice)["Weekend Hike"]["id"]
    carmen_id = client.get("/users/lookup", params={"query": CARMEN}, headers=alice).json()["id"]
    client.delete(f"/groups/{hike}/members/{carmen_id}", headers=alice)
    with socket(client, login(client, HANA)) as hana, socket(client, login(client, CARMEN)) as carmen, \
            socket(client, alice) as a:
        _typing(hana, hike)
        assert recv_until(hana, "error")["code"] == "not_found"
        _typing(carmen, hike)
        assert recv_until(carmen, "error")["code"] == "forbidden"
        assert of_type(drain(a), "typing") == []


def test_closing_a_tab_mid_sentence_tells_the_others_it_stopped(client, alice):
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    with socket(client, login(client, CARMEN)) as c:
        with socket(client, alice) as a:
            _typing(a, chat)
            assert recv_until(c, "typing")["typing"] is True
        assert recv_until(c, "typing")["typing"] is False  # sent by the server on disconnect


def test_typing_is_never_written_to_the_database(client, alice):
    chat = chats(client, alice)["Carmen Ruiz"]["id"]
    before = client.get(f"/conversations/{chat}/messages", headers=alice).json()
    with socket(client, alice) as a, socket(client, login(client, CARMEN)):
        _typing(a, chat)
        drain(a)
    assert client.get(f"/conversations/{chat}/messages", headers=alice).json() == before


# --- presence ------------------------------------------------------------------------

def test_peer_coming_online_is_announced_and_visible_in_ready(client, alice):
    with socket(client, alice) as a:
        with socket(client, login(client, CARMEN)) as c:
            came_online = recv_until(a, "presence")
            carmen_id = c.ready["user_id"]
            assert c.ready["online_user_ids"] == [client.get("/me", headers=alice).json()["id"]]
    assert (came_online["user_id"], came_online["online"]) == (carmen_id, True)
    assert came_online["last_seen_at"] is not None


def test_goes_offline_only_when_the_last_tab_closes_and_last_seen_is_saved(client, alice):
    carmen_h = login(client, CARMEN)
    _set_last_seen(client, CARMEN, 5)
    with socket(client, alice) as a:
        with socket(client, carmen_h) as tab1:
            recv_until(a, "presence", online=True)
            with socket(client, carmen_h):
                pass  # a second tab opens and closes: she is still online through tab1
            assert of_type(drain(a), "presence") == []
            assert _last_seen(client, CARMEN) > 5
            _set_last_seen(client, CARMEN, 5)
        offline = recv_until(a, "presence")
    assert offline["online"] is False and offline["last_seen_at"] > 5
    assert _last_seen(client, CARMEN) == offline["last_seen_at"]
    # The REST profile now shows the real value.
    seen = client.get("/users/lookup", params={"query": CARMEN}, headers=alice).json()["last_seen_at"]
    assert seen == offline["last_seen_at"]


def test_presence_goes_only_to_direct_chat_peers(client, alice):
    # Hana has no chats; Dev and Bob share a group but have no 1:1 chat. Neither pair is announced.
    with socket(client, login(client, BOB)) as bob:
        with socket(client, login(client, DEV)), socket(client, login(client, HANA)):
            assert of_type(drain(bob), "presence") == []


def test_ping_refreshes_last_seen_at_most_once_per_interval(client, alice):
    with socket(client, alice) as a:
        _set_last_seen(client, ALICE, 5)
        drain(a)  # a ping right after connect: this tab already wrote last_seen moments ago
        assert _last_seen(client, ALICE) == 5

        # Pretend the interval has elapsed: the next ping writes, and the one after does not.
        a_conn = next(iter(client.app.state.realtime.hub._by_user[client.get("/me", headers=alice).json()["id"]]))
        a_conn.last_touch_ms = 0
        drain(a)
        refreshed = _last_seen(client, ALICE)
        assert refreshed > 5
        _set_last_seen(client, ALICE, 5)
        drain(a)
        assert _last_seen(client, ALICE) == 5


def test_an_abruptly_closed_socket_does_not_leave_its_user_online(client, alice):
    carmen_h = login(client, CARMEN)
    alice_id = client.get("/me", headers=alice).json()["id"]
    with socket(client, alice) as a:
        with socket(client, carmen_h):
            recv_until(a, "presence", online=True)
        recv_until(a, "presence", online=False)
        hub = client.app.state.realtime.hub
        assert hub.online_among(list(range(1, 9))) == [alice_id]  # only Alice's own open tab
