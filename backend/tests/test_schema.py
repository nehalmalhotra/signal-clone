"""Schema constraints, seed invariants, and index usage."""

import sqlite3

import pytest
from fastapi.testclient import TestClient

import app.main
from app.db.connection import get_connection, init_db
from app.db.seed import seed, seed_if_empty

NOW = 1_760_000_000_000


@pytest.fixture
def conn(tmp_path):
    c = get_connection(tmp_path / "test.db")
    init_db(c)
    seed(c, now_ms=NOW)
    yield c
    c.close()


def user_id(conn, given_name):
    return conn.execute("SELECT id FROM users WHERE given_name = ?", (given_name,)).fetchone()["id"]


def conv_id(conn, *, name=None, between=None):
    if name:
        return conn.execute("SELECT id FROM conversations WHERE name = ?", (name,)).fetchone()["id"]
    low, high = sorted(user_id(conn, n) for n in between)
    return conn.execute("SELECT id FROM conversations WHERE direct_key = ?",
                        (f"{low}:{high}",)).fetchone()["id"]


# --- constraints ---------------------------------------------------------------

def test_duplicate_direct_chat_is_rejected(conn):
    low, high = sorted((user_id(conn, "Alice"), user_id(conn, "Bob")))
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO conversations (type, direct_key, created_by, created_at) "
                     "VALUES ('direct', ?, ?, 0)", (f"{low}:{high}", low))


def test_direct_chat_cannot_have_a_name(conn):
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO conversations (type, direct_key, name, created_by, created_at) "
                     "VALUES ('direct', '98:99', 'Oops', 1, 0)")


def test_group_requires_a_name_and_no_direct_key(conn):
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO conversations (type, created_by, created_at) VALUES ('group', 1, 0)")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO conversations (type, direct_key, name, created_by, created_at) "
                     "VALUES ('group', '1:2', 'G', 1, 0)")


def test_foreign_keys_are_enforced(conn):
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO contacts (owner_id, contact_id, created_at) VALUES (1, 9999, 0)")


def test_receipt_status_outside_1_to_3_is_rejected(conn):
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("UPDATE message_receipts SET status = 4 WHERE rowid = 1")


def test_username_is_unique_ignoring_case(conn):
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO users (phone_number, username, given_name, avatar_color, created_at) "
                     "VALUES ('+15559999', 'ALICE.42', 'Fake', 'A100', 0)")


def test_retried_send_with_same_client_id_is_rejected(conn):
    row = conn.execute("SELECT * FROM messages WHERE kind = 'text' LIMIT 1").fetchone()
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO messages (conversation_id, sender_id, client_id, body, sent_at) "
                     "VALUES (?, ?, ?, 'dup', 0)",
                     (row["conversation_id"], row["sender_id"], row["client_id"]))


# --- seed invariants -----------------------------------------------------------

def test_seed_counts(conn):
    count = lambda table: conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    assert count("users") == 8
    assert count("conversations") == 7
    assert count("messages") == 65


def test_seed_if_empty_does_not_reseed(conn):
    assert seed_if_empty(conn) is False
    assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 8


def test_message_ids_follow_time_across_all_chats(conn):
    # Live messages get ids in arrival order; the seed must behave the same (D-8).
    times = [r[0] for r in conn.execute("SELECT sent_at FROM messages ORDER BY id")]
    assert times == sorted(times)


def test_receipts_only_for_active_non_sender_members(conn):
    # A receipt is legitimate only if the message was sent while the recipient was inside the chat
    # (inside one of their membership_periods, and strictly before they left).
    bad = conn.execute("""
        SELECT r.message_id, r.recipient_id
        FROM message_receipts r
        JOIN messages m ON m.id = r.message_id
        WHERE r.recipient_id = m.sender_id
           OR m.kind <> 'text'
           OR NOT EXISTS (
               SELECT 1 FROM membership_periods p
               WHERE p.conversation_id = m.conversation_id AND p.user_id = r.recipient_id
                 AND m.sent_at >= p.joined_at AND (p.left_at IS NULL OR m.sent_at < p.left_at))
    """).fetchall()
    assert bad == []


def test_every_member_has_a_period_and_at_most_one_is_open(conn):
    no_period = conn.execute("""
        SELECT cm.conversation_id, cm.user_id FROM conversation_members cm
        WHERE NOT EXISTS (SELECT 1 FROM membership_periods p
                          WHERE p.conversation_id = cm.conversation_id AND p.user_id = cm.user_id)
    """).fetchall()
    assert no_period == []


def test_second_open_period_for_the_same_member_is_rejected(conn):
    row = conn.execute("SELECT conversation_id, user_id FROM membership_periods WHERE left_at IS NULL").fetchone()
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO membership_periods (conversation_id, user_id, joined_at) VALUES (?, ?, 1)",
                     (row["conversation_id"], row["user_id"]))


def test_period_cannot_end_before_it_starts(conn):
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("UPDATE membership_periods SET left_at = joined_at - 1 WHERE left_at IS NULL")


def test_period_needs_a_member_row(conn):
    # Hana belongs to no chat, so a period for her has no conversation_members row to point at.
    hana = user_id(conn, "Hana")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO membership_periods (conversation_id, user_id, joined_at) VALUES (1, ?, 1)",
                     (hana,))


def test_reads_are_in_order(conn):
    # Nobody has read a message while an older one they received is still unread.
    bad = conn.execute("""
        SELECT later.message_id
        FROM message_receipts later
        JOIN messages lm ON lm.id = later.message_id
        JOIN message_receipts earlier ON earlier.recipient_id = later.recipient_id
        JOIN messages em ON em.id = earlier.message_id
        WHERE em.conversation_id = lm.conversation_id
          AND em.id < lm.id
          AND later.status = 3 AND earlier.status < 3
    """).fetchall()
    assert bad == []


def test_alice_unread_counts(conn):
    alice = user_id(conn, "Alice")
    rows = conn.execute("""
        SELECT m.conversation_id, COUNT(*) AS unread
        FROM message_receipts r JOIN messages m ON m.id = r.message_id
        WHERE r.recipient_id = ? AND r.status < 3
        GROUP BY m.conversation_id
    """, (alice,)).fetchall()
    unread = {r["conversation_id"]: r["unread"] for r in rows}
    assert unread == {
        conv_id(conn, between=("Alice", "Carmen")): 3,
        conv_id(conn, name="Book Club"): 2,
    }


def _bubble_status_of_last_message(conn, cid):
    # Signal's rule: the bubble shows the highest status any recipient reached.
    return conn.execute("""
        SELECT MAX(r.status) FROM message_receipts r
        WHERE r.message_id = (SELECT MAX(id) FROM messages WHERE conversation_id = ?)
    """, (cid,)).fetchone()[0]


def test_bubble_statuses_cover_every_state(conn):
    assert _bubble_status_of_last_message(conn, conv_id(conn, between=("Alice", "Bob"))) == 1
    assert _bubble_status_of_last_message(conn, conv_id(conn, between=("Alice", "Dev"))) == 3
    hike = conv_id(conn, name="Weekend Hike")
    assert _bubble_status_of_last_message(conn, hike) == 3
    # ...while the Info view still shows Dev as only "delivered".
    statuses = dict(conn.execute("""
        SELECT u.given_name, r.status FROM message_receipts r JOIN users u ON u.id = r.recipient_id
        WHERE r.message_id = (SELECT MAX(id) FROM messages WHERE conversation_id = ?)
    """, (hike,)).fetchall())
    assert statuses == {"Bob": 3, "Carmen": 3, "Dev": 2}


# --- indexes ---------------------------------------------------------------------

def _plan(conn, sql, params):
    return " ".join(row["detail"] for row in conn.execute("EXPLAIN QUERY PLAN " + sql, params))


def test_chat_list_uses_member_index(conn):
    plan = _plan(conn, "SELECT conversation_id FROM conversation_members WHERE user_id = ?", (1,))
    assert "idx_members_user" in plan


def test_history_page_uses_message_index_without_sorting(conn):
    plan = _plan(conn, "SELECT * FROM messages WHERE conversation_id = ? AND id < ? "
                       "ORDER BY id DESC LIMIT 50", (1, 1000))
    assert "idx_messages_conv" in plan
    assert "TEMP B-TREE" not in plan  # no separate sort step


def test_visibility_filter_is_index_served_and_needs_no_sort(conn):
    from app.services import membership
    sql = (f"SELECT * FROM messages m WHERE m.conversation_id = :conv AND {membership.VISIBLE_TO_VIEWER} "
           "ORDER BY m.id DESC LIMIT 51")
    plan = " ".join(r["detail"] for r in conn.execute("EXPLAIN QUERY PLAN " + sql, {"conv": 1, "viewer": 1}))
    assert "idx_messages_conv" in plan and "idx_periods_user_conv" in plan
    assert "TEMP B-TREE" not in plan


def test_unread_counts_use_receipt_index(conn):
    plan = _plan(conn, "SELECT message_id FROM message_receipts WHERE recipient_id = ? AND status < 3",
                 (1,))
    assert "idx_receipts_recipient" in plan


# --- app startup -----------------------------------------------------------------

def test_startup_creates_and_seeds_db_and_health_ok(tmp_path, monkeypatch):
    db_path = tmp_path / "startup.db"
    monkeypatch.setattr(app.main, "DATABASE_PATH", db_path)
    with TestClient(app.main.app) as client:
        assert client.get("/health").json() == {"status": "ok"}
    check = sqlite3.connect(db_path)
    assert check.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 8
    check.close()
