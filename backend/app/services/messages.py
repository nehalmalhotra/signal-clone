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
    membership.require_member(conn, conv_id, viewer_id)
    # Only messages sent during one of the viewer's stints: nothing from before they joined,
    # nothing from while they were out, nothing after they were removed.
    sql = f"{_SELECT} WHERE m.conversation_id = :conv AND {membership.VISIBLE_TO_VIEWER}"
    params = {"conv": conv_id, "viewer": viewer_id, "limit": limit + 1}
    if before_id is not None:
        sql += " AND m.id < :before"
        params["before"] = before_id
    # Fetch one extra row to learn whether an older page exists, without a second COUNT query.
    rows = conn.execute(sql + " ORDER BY m.id DESC LIMIT :limit", params).fetchall()
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


def mark_read(conn: sqlite3.Connection, conv_id: int, user_id: int, up_to_id: int,
              now: int | None = None) -> list[tuple[int, int]]:
    """Mark the viewer's unread messages up to up_to_id as read.

    Returns (message_id, sender_id) for every receipt that actually changed, so the caller can
    tell each sender. A repeat call changes nothing and returns [].
    """
    membership.require_member(conn, conv_id, user_id)
    now = clock.now_ms() if now is None else now
    # One UPDATE ... RETURNING: no gap between "find unread" and "mark read" for a receipt to slip into.
    with conn:
        ids = [r["message_id"] for r in conn.execute(
            """UPDATE message_receipts SET status = ?, updated_at = ?
               WHERE recipient_id = ? AND status < ?
                 AND message_id IN (SELECT id FROM messages WHERE conversation_id = ? AND id <= ?)
               RETURNING message_id""",
            (STATUS_READ, now, user_id, STATUS_READ, conv_id, up_to_id))]
    senders = _conversation_and_sender(conn, ids)
    return [(mid, senders[mid][1]) for mid in sorted(ids)]


def mark_delivered(conn: sqlite3.Connection, message_id: int, recipient_ids: list[int], now: int) -> list[int]:
    """Server-side "delivered" (D-27): move sent -> delivered for recipients whose socket just got
    the push. Returns the users actually changed; a second tab's push changes nothing."""
    if not recipient_ids:
        return []
    marks = ",".join("?" * len(recipient_ids))
    with conn:
        rows = conn.execute(
            f"""UPDATE message_receipts SET status = ?, updated_at = ?
                WHERE message_id = ? AND status = ? AND recipient_id IN ({marks})
                RETURNING recipient_id""",
            (STATUS_DELIVERED, now, message_id, STATUS_SENT, *recipient_ids)).fetchall()
    return [r["recipient_id"] for r in rows]


def undelivered_recipient_ids(conn: sqlite3.Connection, message_id: int) -> list[int]:
    """Recipients whose receipt is still 'sent': nobody has confirmed the push reached them."""
    return [r["recipient_id"] for r in conn.execute(
        "SELECT recipient_id FROM message_receipts WHERE message_id = ? AND status = ?",
        (message_id, STATUS_SENT))]


def mark_all_delivered(conn: sqlite3.Connection, user_id: int, now: int) -> list[tuple[int, int, int]]:
    """A user just connected: everything still 'sent' to them counts as delivered (catch-up).
    Served by idx_receipts_recipient. Returns (message_id, conversation_id, sender_id)."""
    with conn:
        ids = [r["message_id"] for r in conn.execute(
            """UPDATE message_receipts SET status = ?, updated_at = ?
               WHERE recipient_id = ? AND status = ? RETURNING message_id""",
            (STATUS_DELIVERED, now, user_id, STATUS_SENT))]
    origin = _conversation_and_sender(conn, ids)
    return [(mid, origin[mid][0], origin[mid][1]) for mid in sorted(ids)]


def _conversation_and_sender(conn: sqlite3.Connection, message_ids: list[int]) -> dict[int, tuple[int, int]]:
    if not message_ids:
        return {}
    marks = ",".join("?" * len(message_ids))
    rows = conn.execute(f"SELECT id, conversation_id, sender_id FROM messages WHERE id IN ({marks})",
                        message_ids).fetchall()
    return {r["id"]: (r["conversation_id"], r["sender_id"]) for r in rows}


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
