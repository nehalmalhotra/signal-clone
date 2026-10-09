import sqlite3

from app import clock
from app.errors import BadRequest
from app.services import membership, messages, users

# One query builds the whole chat list. p is the viewer's LATEST stint in each chat (open =
# still a member, closed = removed, D-25). The subqueries are the "last message", "unread" and
# "member count" columns. The last-message subquery walks the chat's messages newest-first
# (idx_messages_conv) and stops at the first one the viewer is allowed to see.
_LIST_SQL = f"""
SELECT c.*, cm.role, p.left_at,
  (SELECT m.id FROM messages m
    WHERE m.conversation_id = c.id AND {membership.VISIBLE_TO_VIEWER}
    ORDER BY m.id DESC LIMIT 1) AS last_id,
  (SELECT COUNT(*) FROM message_receipts r JOIN messages m ON m.id = r.message_id
    WHERE m.conversation_id = c.id AND r.recipient_id = :viewer AND r.status < 3) AS unread,
  (SELECT COUNT(*) FROM membership_periods x
    WHERE x.conversation_id = c.id AND x.left_at IS NULL) AS member_count
FROM conversation_members cm
JOIN conversations c ON c.id = cm.conversation_id
JOIN membership_periods p ON p.id = (
    SELECT MAX(id) FROM membership_periods
    WHERE conversation_id = c.id AND user_id = :viewer)
WHERE cm.user_id = :viewer
"""


def list_for_user(conn: sqlite3.Connection, user_id: int) -> list[dict]:
    summaries = _summaries(conn, user_id, _LIST_SQL)
    # id breaks ties so the order is stable when two chats share a timestamp.
    summaries.sort(key=lambda s: (s["last_activity_at"], s["id"]), reverse=True)
    return summaries


def get_summary(conn: sqlite3.Connection, conv_id: int, user_id: int) -> dict:
    membership.require_member(conn, conv_id, user_id)
    return _summaries(conn, user_id, _LIST_SQL + " AND c.id = :cid", {"cid": conv_id})[0]


def get_detail(conn: sqlite3.Connection, conv_id: int, user_id: int) -> dict:
    summary = get_summary(conn, conv_id, user_id)
    rows = conn.execute(
        """SELECT u.*, cm.role, p.joined_at FROM conversation_members cm
           JOIN users u ON u.id = cm.user_id
           JOIN membership_periods p ON p.conversation_id = cm.conversation_id
                                    AND p.user_id = cm.user_id AND p.left_at IS NULL
           WHERE cm.conversation_id = ?
           ORDER BY cm.role = 'admin' DESC, u.given_name COLLATE NOCASE""",
        (conv_id,),
    ).fetchall()
    own = membership.require_member(conn, conv_id, user_id)
    return {
        **summary,
        "my_role": own["role"] if own["left_at"] is None else None,
        "members": [{"user": users.to_public(r), "role": r["role"], "joined_at": r["joined_at"]}
                    for r in rows],
    }


def get_or_create_direct(conn: sqlite3.Connection, user_id: int, other_id: int) -> tuple[dict, bool]:
    if user_id == other_id:
        raise BadRequest("You can't start a chat with yourself")
    users.get_user(conn, other_id)  # NotFound if the id doesn't exist
    low, high = sorted((user_id, other_id))
    key = f"{low}:{high}"

    row = conn.execute("SELECT id FROM conversations WHERE direct_key = ?", (key,)).fetchone()
    created = row is None
    if created:
        now = clock.now_ms()
        try:
            with conn:
                cur = conn.execute(
                    "INSERT INTO conversations (type, direct_key, created_by, created_at) VALUES ('direct', ?, ?, ?)",
                    (key, user_id, now),
                )
                pair = [(cur.lastrowid, user_id), (cur.lastrowid, other_id)]
                conn.executemany("INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)", pair)
                conn.executemany(
                    "INSERT INTO membership_periods (conversation_id, user_id, joined_at) VALUES (?, ?, ?)",
                    [(c, u, now) for c, u in pair],
                )
            conv_id = cur.lastrowid
        except sqlite3.IntegrityError:
            # Both people opened the chat at the same moment; UNIQUE(direct_key) let only one win.
            conv_id = conn.execute("SELECT id FROM conversations WHERE direct_key = ?", (key,)).fetchone()["id"]
            created = False
    else:
        conv_id = row["id"]
    return get_summary(conn, conv_id, user_id), created


def _summaries(conn: sqlite3.Connection, user_id: int, sql: str, extra: dict | None = None) -> list[dict]:
    rows = conn.execute(sql, {"viewer": user_id, **(extra or {})}).fetchall()
    last = messages.load_by_ids(conn, [r["last_id"] for r in rows if r["last_id"]], user_id)
    peers = _peers(conn, [r["id"] for r in rows if r["type"] == "direct"], user_id)

    result = []
    for r in rows:
        peer = peers.get(r["id"])
        last_message = last.get(r["last_id"])
        result.append({
            "id": r["id"],
            "type": r["type"],
            "title": users.display_name(peer) if peer else r["name"],
            "avatar_url": (users.to_public(peer)["avatar_url"] if peer
                           else f"/media/{r['avatar_path']}" if r["avatar_path"] else None),
            "avatar_color": peer["avatar_color"] if peer else r["avatar_color"],
            "peer": users.to_public(peer) if peer else None,
            "member_count": r["member_count"],
            "is_member": r["left_at"] is None,
            "last_message": last_message,
            # Someone removed from a group has nothing left to read there.
            "unread_count": r["unread"] if r["left_at"] is None else 0,
            "last_activity_at": last_message["sent_at"] if last_message else r["created_at"],
        })
    return result


def _peers(conn: sqlite3.Connection, direct_ids: list[int], user_id: int) -> dict[int, sqlite3.Row]:
    """The other person in each direct chat, fetched in one query."""
    if not direct_ids:
        return {}
    marks = ",".join("?" * len(direct_ids))
    rows = conn.execute(
        f"""SELECT cm.conversation_id, u.* FROM conversation_members cm
            JOIN users u ON u.id = cm.user_id
            WHERE cm.conversation_id IN ({marks}) AND cm.user_id <> ?""",
        (*direct_ids, user_id),
    ).fetchall()
    return {r["conversation_id"]: r for r in rows}
