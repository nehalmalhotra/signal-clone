"""Insert the demo data from seed_data.py.

Run automatically on startup when the DB is empty (app/main.py), or by hand:
    python -m app.db.seed --reset     # delete the DB file, recreate, reseed
"""

import argparse
import json
import sqlite3
import time

from app.config import DATABASE_PATH
from app.db import seed_data
from app.db.connection import get_connection, init_db

STATUS_SENT, STATUS_DELIVERED, STATUS_READ = 1, 2, 3

# How long after sending a seeded message counts as "delivered" / "read".
DELIVERY_DELAY_MS = 2_000
READ_DELAY_MS = 60_000


def _ago(now_ms: int, minutes: int) -> int:
    return now_ms - minutes * 60_000


def seed_if_empty(conn: sqlite3.Connection) -> bool:
    """Seed only a brand-new DB, so restarting on a persistent volume never wipes data."""
    if conn.execute("SELECT 1 FROM users LIMIT 1").fetchone():
        return False
    seed(conn)
    return True


def seed(conn: sqlite3.Connection, now_ms: int | None = None) -> None:
    now_ms = now_ms if now_ms is not None else int(time.time() * 1000)
    # One transaction: a crash halfway leaves an empty DB, which is reseeded next start.
    with conn:
        user_ids = _insert_users(conn, now_ms)
        _insert_contacts(conn, user_ids, now_ms)
        pending = []
        for conv in seed_data.CONVERSATIONS:
            pending += _insert_conversation(conn, conv, user_ids, now_ms)
        # Insert messages from all chats in time order, so message ids follow arrival
        # order across the whole DB exactly as they will for live messages (D-8).
        pending.sort(key=lambda m: m["sent_at"])
        for message in pending:
            _insert_message(conn, message)


def _insert_users(conn: sqlite3.Connection, now_ms: int) -> dict[str, int]:
    user_ids = {}
    created_at = _ago(now_ms, seed_data.USERS_CREATED_MINUTES_AGO)
    for u in seed_data.USERS:
        cur = conn.execute(
            """INSERT INTO users (phone_number, username, given_name, family_name, about,
                                  avatar_color, last_seen_at, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (u["phone"], u["username"], u["given"], u["family"], u["about"],
             u["color"], _ago(now_ms, u["last_seen"]), created_at),
        )
        user_ids[u["handle"]] = cur.lastrowid
    return user_ids


def _insert_contacts(conn: sqlite3.Connection, user_ids: dict[str, int], now_ms: int) -> None:
    created_at = _ago(now_ms, seed_data.USERS_CREATED_MINUTES_AGO)
    conn.executemany(
        "INSERT INTO contacts (owner_id, contact_id, created_at) VALUES (?, ?, ?)",
        [(user_ids[owner], user_ids[c], created_at)
         for owner, contacts in seed_data.CONTACTS.items() for c in contacts],
    )


def _insert_conversation(conn: sqlite3.Connection, conv: dict, user_ids: dict[str, int],
                         now_ms: int) -> list[dict]:
    """Insert the chat and its members; return its messages (with receipts) to insert later."""
    messages = conv["messages"]
    minutes = [m[0] for m in messages]
    assert minutes == sorted(minutes, reverse=True), f"{conv['key']}: messages out of order"

    created_at = _ago(now_ms, messages[0][0])
    member_ids = [user_ids[m["user"]] for m in conv["members"]]

    if conv["type"] == "direct":
        low, high = sorted(member_ids)
        cur = conn.execute(
            """INSERT INTO conversations (type, direct_key, created_by, created_at)
               VALUES ('direct', ?, ?, ?)""",
            (f"{low}:{high}", user_ids[messages[0][1]], created_at),
        )
    else:
        cur = conn.execute(
            """INSERT INTO conversations (type, name, avatar_color, created_by, created_at)
               VALUES ('group', ?, ?, ?, ?)""",
            (conv["name"], conv["color"], user_ids[conv["created_by"]], created_at),
        )
    conv_id = cur.lastrowid

    # Membership windows, used below to decide who receives each message.
    windows = {}
    for m in conv["members"]:
        joined_at = _ago(now_ms, m["joined"]) if "joined" in m else created_at
        left_at = _ago(now_ms, m["left"]) if "left" in m else None
        windows[user_ids[m["user"]]] = (joined_at, left_at)
        conn.execute(
            """INSERT INTO conversation_members (conversation_id, user_id, role, joined_at, left_at)
               VALUES (?, ?, ?, ?, ?)""",
            (conv_id, user_ids[m["user"]], m.get("role", "member"), joined_at, left_at),
        )

    read_upto = {user_ids[h]: i for h, i in conv.get("read_upto", {}).items()}
    delivered_upto = {user_ids[h]: i for h, i in conv.get("delivered_upto", {}).items()}
    last_index = len(messages) - 1

    pending = []
    for index, (minutes_ago, sender, content) in enumerate(messages):
        sender_id = user_ids[sender]
        sent_at = _ago(now_ms, minutes_ago)
        is_update = isinstance(content, dict)
        receipts = []
        # Group updates have no receipts (D-11). Text messages get receipts only for
        # people who were active members when it was sent, as the real send path will (D-6).
        for recipient_id, (joined_at, left_at) in windows.items():
            if is_update or recipient_id == sender_id or joined_at > sent_at:
                continue
            if left_at is not None and left_at <= sent_at:
                continue
            if index <= read_upto.get(recipient_id, last_index):
                status, updated_at = STATUS_READ, sent_at + READ_DELAY_MS
            elif index <= delivered_upto.get(recipient_id, -1):
                status, updated_at = STATUS_DELIVERED, sent_at + DELIVERY_DELAY_MS
            else:
                status, updated_at = STATUS_SENT, sent_at
            receipts.append((recipient_id, status, min(updated_at, now_ms)))

        pending.append({
            "conversation_id": conv_id,
            "sender_id": sender_id,
            "client_id": f"seed-{conv['key']}-{index}",
            "kind": "group_update" if is_update else "text",
            "body": None if is_update else content,
            "meta": _update_meta(content, user_ids) if is_update else None,
            "sent_at": sent_at,
            "receipts": receipts,
        })
    return pending


def _insert_message(conn: sqlite3.Connection, m: dict) -> None:
    cur = conn.execute(
        """INSERT INTO messages (conversation_id, sender_id, client_id, kind, body, meta, sent_at)
           VALUES (:conversation_id, :sender_id, :client_id, :kind, :body, :meta, :sent_at)""",
        m,
    )
    conn.executemany(
        """INSERT INTO message_receipts (message_id, recipient_id, status, updated_at)
           VALUES (?, ?, ?, ?)""",
        [(cur.lastrowid, *receipt) for receipt in m["receipts"]],
    )


def _update_meta(content: dict, user_ids: dict[str, int]) -> str:
    meta = {"action": content["action"]}
    if "targets" in content:
        meta["target_ids"] = [user_ids[h] for h in content["targets"]]
    return json.dumps(meta)


def _reset() -> None:
    # WAL mode keeps two side files next to the DB; remove them too.
    for suffix in ("", "-wal", "-shm"):
        DATABASE_PATH.with_name(DATABASE_PATH.name + suffix).unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the Signal clone database.")
    parser.add_argument("--reset", action="store_true", help="delete the DB file first")
    args = parser.parse_args()

    if args.reset:
        _reset()
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_connection()
    try:
        init_db(conn)
        seeded = seed_if_empty(conn)
    finally:
        conn.close()
    print(f"{'Seeded' if seeded else 'Already seeded'}: {DATABASE_PATH}")


if __name__ == "__main__":
    main()
