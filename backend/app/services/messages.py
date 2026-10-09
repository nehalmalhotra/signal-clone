"""Messages and receipts. REST calls these today; the Phase 3 WebSocket handler will too."""

import json
import sqlite3
import uuid

from app import clock
from app.errors import BadRequest, Conflict, Forbidden, NotFound
from app.services import membership, users

STATUS_SENT, STATUS_DELIVERED, STATUS_READ = 1, 2, 3
STATUS_NAMES = {STATUS_SENT: "sent", STATUS_DELIVERED: "delivered", STATUS_READ: "read"}

# top_status = the furthest state any recipient reached, i.e. what the bubble icon shows.
_SELECT = """SELECT m.*,
        (SELECT MAX(r.status) FROM message_receipts r WHERE r.message_id = m.id) AS top_status
     FROM messages m"""


def to_message(row: sqlite3.Row, viewer_id: int) -> dict:
    status = None
    if row["sender_id"] == viewer_id and row["kind"] == "text":
        # No receipt rows (e.g. everyone else left) still counts as sent.
        status = STATUS_NAMES[row["top_status"] or STATUS_SENT]
    return {
        "id": row["id"],
        "conversation_id": row["conversation_id"],
        "sender_id": row["sender_id"],
        "client_id": row["client_id"],
        "kind": row["kind"],
        "body": row["body"],
        "meta": json.loads(row["meta"]) if row["meta"] else None,
        "sent_at": row["sent_at"],
        "status": status,
    }


def load_by_ids(conn: sqlite3.Connection, ids: list[int], viewer_id: int) -> dict[int, dict]:
    if not ids:
        return {}
    marks = ",".join("?" * len(ids))
    rows = conn.execute(f"{_SELECT} WHERE m.id IN ({marks})", ids).fetchall()
    return {r["id"]: to_message(r, viewer_id) for r in rows}


def list_messages(conn: sqlite3.Connection, conv_id: int, viewer_id: int,
                  before_id: int | None, limit: int) -> tuple[list[dict], bool]:
    """One page of history, newest page first when before_id is omitted."""
    member = membership.require_member(conn, conv_id, viewer_id)
    sql, params = f"{_SELECT} WHERE m.conversation_id = ?", [conv_id]
    if before_id is not None:
        sql += " AND m.id < ?"
        params.append(before_id)
    if member["left_at"] is not None:
        # A removed member keeps what they saw, but nothing sent after they left.
        sql += " AND m.sent_at <= ?"
        params.append(member["left_at"])
    # Fetch one extra row to learn whether an older page exists, without a second COUNT query.
    rows = conn.execute(sql + " ORDER BY m.id DESC LIMIT ?", (*params, limit + 1)).fetchall()
    has_more = len(rows) > limit
    page = [to_message(r, viewer_id) for r in rows[:limit]]
    page.reverse()
    return page, has_more


def create_message(conn: sqlite3.Connection, conv_id: int, sender_id: int, client_id: str,
                   body: str) -> tuple[dict, bool]:
    """Store a text message and one 'sent' receipt per other active member.

    Returns (message, created). A repeat of the same (sender, client_id) returns the
    original with created=False, so a retry after a dropped connection can't double-send.
    """
    membership.require_active_member(conn, conv_id, sender_id)
    body = body.strip()
    if not body:
        raise BadRequest("Message can't be empty")

    existing = _find_by_client_id(conn, sender_id, client_id)
    if existing is not None:
        return _reuse(existing, conv_id, sender_id), False

    now = clock.now_ms()
    try:
        with conn:  # message + receipts commit together or not at all
            cur = conn.execute(
                """INSERT INTO messages (conversation_id, sender_id, client_id, kind, body, sent_at)
                   VALUES (?, ?, ?, 'text', ?, ?)""",
                (conv_id, sender_id, client_id, body, now),
            )
            conn.executemany(
                """INSERT INTO message_receipts (message_id, recipient_id, status, updated_at)
                   VALUES (?, ?, ?, ?)""",
                [(cur.lastrowid, uid, STATUS_SENT, now)
                 for uid in membership.active_member_ids(conn, conv_id) if uid != sender_id],
            )
    except sqlite3.IntegrityError:
        # Two identical sends raced past the check above; UNIQUE(sender_id, client_id) caught it.
        existing = _find_by_client_id(conn, sender_id, client_id)
        if existing is None:
            raise
        return _reuse(existing, conv_id, sender_id), False
    return load_by_ids(conn, [cur.lastrowid], sender_id)[cur.lastrowid], True


def _find_by_client_id(conn: sqlite3.Connection, sender_id: int, client_id: str) -> sqlite3.Row | None:
    return conn.execute(f"{_SELECT} WHERE m.sender_id = ? AND m.client_id = ?",
                        (sender_id, client_id)).fetchone()


def _reuse(row: sqlite3.Row, conv_id: int, sender_id: int) -> dict:
    if row["conversation_id"] != conv_id:
        raise Conflict("That client_id was already used for a different conversation")
    return to_message(row, sender_id)


def add_group_update(conn: sqlite3.Connection, conv_id: int, actor_id: int, meta: dict,
                     now: int) -> None:
    """Timeline entry such as "Alice added Bob". Caller owns the transaction. No receipts (D-11)."""
    conn.execute(
        """INSERT INTO messages (conversation_id, sender_id, client_id, kind, meta, sent_at)
           VALUES (?, ?, ?, 'group_update', ?, ?)""",
        (conv_id, actor_id, f"update-{uuid.uuid4().hex}", json.dumps(meta), now),
    )


def mark_read(conn: sqlite3.Connection, conv_id: int, user_id: int, up_to_id: int) -> list[int]:
    """Mark the viewer's unread messages up to up_to_id as read. Returns the affected message ids
    (Phase 3 uses them to tell the senders)."""
    membership.require_member(conn, conv_id, user_id)
    now = clock.now_ms()
    with conn:
        ids = [r["message_id"] for r in conn.execute(
            """SELECT r.message_id FROM message_receipts r JOIN messages m ON m.id = r.message_id
               WHERE r.recipient_id = ? AND r.status < ? AND m.conversation_id = ? AND m.id <= ?""",
            (user_id, STATUS_READ, conv_id, up_to_id))]
        conn.executemany(
            "UPDATE message_receipts SET status = ?, updated_at = ? WHERE message_id = ? AND recipient_id = ?",
            [(STATUS_READ, now, mid, user_id) for mid in ids],
        )
    return ids


def receipts_for(conn: sqlite3.Connection, message_id: int, viewer_id: int) -> list[dict]:
    """Per-recipient status for the Info view. Only the sender may see it."""
    msg = conn.execute("SELECT conversation_id, sender_id FROM messages WHERE id = ?",
                       (message_id,)).fetchone()
    if msg is None:
        raise NotFound("Message not found")
    membership.require_member(conn, msg["conversation_id"], viewer_id)  # hides it from outsiders
    if msg["sender_id"] != viewer_id:
        raise Forbidden("Only the sender can see message details")
    rows = conn.execute(
        """SELECT u.*, r.status, r.updated_at AS receipt_updated_at
           FROM message_receipts r JOIN users u ON u.id = r.recipient_id
           WHERE r.message_id = ? ORDER BY u.given_name COLLATE NOCASE""",
        (message_id,),
    ).fetchall()
    return [{"user": users.to_public(r), "status": STATUS_NAMES[r["status"]],
             "updated_at": r["receipt_updated_at"]} for r in rows]
