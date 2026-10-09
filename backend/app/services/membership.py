"""Who may do what inside a conversation. Every other service starts here."""

import sqlite3

from app.errors import Forbidden, NotFound


def get_membership(conn: sqlite3.Connection, conv_id: int, user_id: int) -> sqlite3.Row | None:
    return conn.execute(
        """SELECT cm.*, c.type FROM conversation_members cm
           JOIN conversations c ON c.id = cm.conversation_id
           WHERE cm.conversation_id = ? AND cm.user_id = ?""",
        (conv_id, user_id),
    ).fetchone()


def require_member(conn: sqlite3.Connection, conv_id: int, user_id: int) -> sqlite3.Row:
    """Current or former member. Outsiders get 404, not 403, so chat ids can't be probed."""
    row = get_membership(conn, conv_id, user_id)
    if row is None:
        raise NotFound("Conversation not found")
    return row


def require_active_member(conn: sqlite3.Connection, conv_id: int, user_id: int) -> sqlite3.Row:
    row = require_member(conn, conv_id, user_id)
    if row["left_at"] is not None:
        raise Forbidden("You're no longer a member of this group")
    return row


def require_admin(conn: sqlite3.Connection, conv_id: int, user_id: int) -> sqlite3.Row:
    row = require_active_member(conn, conv_id, user_id)
    if row["type"] != "group" or row["role"] != "admin":
        raise Forbidden("Only group admins can do this")
    return row


def active_member_ids(conn: sqlite3.Connection, conv_id: int) -> list[int]:
    return [r["user_id"] for r in conn.execute(
        "SELECT user_id FROM conversation_members WHERE conversation_id = ? AND left_at IS NULL",
        (conv_id,))]
