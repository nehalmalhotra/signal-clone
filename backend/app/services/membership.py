"""Who may do what inside a conversation. Every other service starts here.

Join/leave times live only in membership_periods (D-25). A person's *current* state is their
latest period: open (left_at NULL) = active member, closed = removed.
"""

import sqlite3

from app.errors import Forbidden, NotFound

# Visibility rule shared by history, last-message previews and the chat list: a message is
# visible to :viewer only if it was sent inside one of their stints in that conversation.
# `m` must be the messages table alias in the surrounding query.
VISIBLE_TO_VIEWER = """EXISTS (
    SELECT 1 FROM membership_periods v
    WHERE v.conversation_id = m.conversation_id AND v.user_id = :viewer
      AND m.sent_at >= v.joined_at AND (v.left_at IS NULL OR m.sent_at <= v.left_at))"""


def get_membership(conn: sqlite3.Connection, conv_id: int, user_id: int) -> sqlite3.Row | None:
    """Role plus the latest stint's joined_at/left_at, or None if they were never a member."""
    return conn.execute(
        """SELECT cm.*, c.type, p.joined_at, p.left_at
           FROM conversation_members cm
           JOIN conversations c ON c.id = cm.conversation_id
           JOIN membership_periods p ON p.id = (
               SELECT MAX(id) FROM membership_periods
               WHERE conversation_id = cm.conversation_id AND user_id = cm.user_id)
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
        "SELECT user_id FROM membership_periods WHERE conversation_id = ? AND left_at IS NULL",
        (conv_id,))]


def other_active_member_ids(conn: sqlite3.Connection, conv_id: int, user_id: int) -> list[int]:
    """Everyone else currently in the chat; raises unless `user_id` is an active member themselves."""
    require_active_member(conn, conv_id, user_id)
    return [uid for uid in active_member_ids(conn, conv_id) if uid != user_id]
