"""Group creation and admin controls. Every change also writes a timeline entry (D-11)."""

import random
import sqlite3

from app import clock
from app.errors import BadRequest, Conflict, NotFound
from app.services import membership, messages, users
from app.services.auth import AVATAR_COLORS


def _require_group(conn: sqlite3.Connection, conv_id: int) -> None:
    row = conn.execute("SELECT type FROM conversations WHERE id = ?", (conv_id,)).fetchone()
    if row is None or row["type"] != "group":
        raise NotFound("Group not found")


def create_group(conn: sqlite3.Connection, creator_id: int, name: str, member_ids: list[int]) -> int:
    name = name.strip()
    if not name:
        raise BadRequest("Group name can't be empty")
    others = [uid for uid in dict.fromkeys(member_ids) if uid != creator_id]  # dedupe, keep order
    if not others:
        raise BadRequest("Add at least one other member")
    for uid in others:
        users.get_user(conn, uid)

    now = clock.now_ms()
    with conn:
        cur = conn.execute(
            """INSERT INTO conversations (type, name, avatar_color, created_by, created_at)
               VALUES ('group', ?, ?, ?, ?)""",
            (name, random.choice(AVATAR_COLORS), creator_id, now),
        )
        conv_id = cur.lastrowid
        conn.execute(
            "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'admin')",
            (conv_id, creator_id),
        )
        conn.executemany(
            "INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)",
            [(conv_id, uid) for uid in others],
        )
        conn.executemany(
            "INSERT INTO membership_periods (conversation_id, user_id, joined_at) VALUES (?, ?, ?)",
            [(conv_id, uid, now) for uid in [creator_id, *others]],
        )
        messages.add_group_update(conn, conv_id, creator_id, {"action": "group_created"}, now)
        messages.add_group_update(conn, conv_id, creator_id,
                                  {"action": "member_added", "target_ids": others}, now)
    return conv_id


def add_members(conn: sqlite3.Connection, conv_id: int, actor_id: int, user_ids: list[int]) -> None:
    _require_group(conn, conv_id)
    membership.require_admin(conn, conv_id, actor_id)
    for uid in user_ids:
        users.get_user(conn, uid)

    now = clock.now_ms()
    added = []
    with conn:
        for uid in dict.fromkeys(user_ids):
            existing = membership.get_membership(conn, conv_id, uid)
            if existing is None:
                conn.execute("INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)",
                             (conv_id, uid))
            elif existing["left_at"] is None:
                continue  # already in the group
            else:
                # Re-adding a removed member: back to a plain member. The old closed stint stays,
                # and the new stint below starts now, so they see their old history but not
                # what was said while they were out.
                conn.execute("UPDATE conversation_members SET role = 'member' WHERE conversation_id = ? AND user_id = ?",
                             (conv_id, uid))
            conn.execute("INSERT INTO membership_periods (conversation_id, user_id, joined_at) VALUES (?, ?, ?)",
                         (conv_id, uid, now))
            added.append(uid)
        if added:
            messages.add_group_update(conn, conv_id, actor_id,
                                      {"action": "member_added", "target_ids": added}, now)


def remove_member(conn: sqlite3.Connection, conv_id: int, actor_id: int, target_id: int) -> None:
    """Admin removes someone, or a member removes themselves (leave)."""
    _require_group(conn, conv_id)
    leaving = actor_id == target_id
    if leaving:
        membership.require_active_member(conn, conv_id, actor_id)
    else:
        membership.require_admin(conn, conv_id, actor_id)
    target = membership.get_membership(conn, conv_id, target_id)
    if target is None or target["left_at"] is not None:
        raise NotFound("That person isn't in this group")

    remaining = [uid for uid in membership.active_member_ids(conn, conv_id) if uid != target_id]
    if target["role"] == "admin" and remaining and not _has_admin(conn, conv_id, excluding=target_id):
        raise Conflict("Make someone else an admin first")

    # Same timestamp for left_at and the timeline entry, so the removed person still sees
    # the "removed" line (the stint closes at left_at and history is visible while sent_at <= left_at).
    now = clock.now_ms()
    meta = ({"action": "member_left"} if leaving
            else {"action": "member_removed", "target_ids": [target_id]})
    with conn:
        conn.execute(
            """UPDATE membership_periods SET left_at = ?
               WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL""",
            (now, conv_id, target_id))
        messages.add_group_update(conn, conv_id, actor_id, meta, now)


def set_role(conn: sqlite3.Connection, conv_id: int, actor_id: int, target_id: int, role: str) -> None:
    _require_group(conn, conv_id)
    membership.require_admin(conn, conv_id, actor_id)
    target = membership.get_membership(conn, conv_id, target_id)
    if target is None or target["left_at"] is not None:
        raise NotFound("That person isn't in this group")
    if target["role"] == role:
        return
    if role == "member" and not _has_admin(conn, conv_id, excluding=target_id):
        raise Conflict("A group needs at least one admin")

    action = "admin_granted" if role == "admin" else "admin_revoked"
    now = clock.now_ms()
    with conn:
        conn.execute(
            "UPDATE conversation_members SET role = ? WHERE conversation_id = ? AND user_id = ?",
            (role, conv_id, target_id))
        messages.add_group_update(conn, conv_id, actor_id, {"action": action, "target_ids": [target_id]}, now)


def _has_admin(conn: sqlite3.Connection, conv_id: int, excluding: int) -> bool:
    return conn.execute(
        """SELECT 1 FROM conversation_members cm
           JOIN membership_periods p ON p.conversation_id = cm.conversation_id
                                    AND p.user_id = cm.user_id AND p.left_at IS NULL
           WHERE cm.conversation_id = ? AND cm.role = 'admin' AND cm.user_id <> ?""",
        (conv_id, excluding),
    ).fetchone() is not None
