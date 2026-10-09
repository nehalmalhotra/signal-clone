"""Mocked phone login + bearer-token sessions (D-9, D-15)."""

import hashlib
import random
import secrets
import sqlite3

from app import clock
from app.config import OTP_CODE, SESSION_TTL_DAYS
from app.errors import BadRequest, Conflict, Unauthorized

AVATAR_COLORS = [f"A{n}" for n in range(100, 220, 10)]

DAY_MS = 24 * 60 * 60 * 1000
# Rewriting last_used_at on every request would make every GET a DB write, and SQLite
# allows one writer at a time. Once an hour is plenty for a 30-day expiry.
TOUCH_INTERVAL_MS = 60 * 60 * 1000


def _hash(token: str) -> str:
    # Tokens are 256 random bits, so a plain fast hash is enough (no salt/slow hash needed).
    return hashlib.sha256(token.encode()).hexdigest()


def check_code(code: str) -> None:
    if not secrets.compare_digest(code.encode(), OTP_CODE.encode()):
        raise BadRequest("Incorrect verification code")


def find_user_by_phone(conn: sqlite3.Connection, phone_number: str) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM users WHERE phone_number = ?", (phone_number,)).fetchone()


def register(conn: sqlite3.Connection, phone_number: str, given_name: str,
             family_name: str | None) -> sqlite3.Row:
    given_name = given_name.strip()
    if not given_name:
        raise BadRequest("Name can't be empty")
    try:
        with conn:
            cur = conn.execute(
                """INSERT INTO users (phone_number, given_name, family_name, avatar_color, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (phone_number, given_name, (family_name or "").strip() or None,
                 random.choice(AVATAR_COLORS), clock.now_ms()),
            )
    except sqlite3.IntegrityError:
        raise Conflict("This number is already registered") from None
    return conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()


def create_session(conn: sqlite3.Connection, user_id: int) -> str:
    """Return a new raw token. Only its hash is stored, so the raw value exists only here."""
    token = secrets.token_urlsafe(32)
    now = clock.now_ms()
    with conn:
        conn.execute(
            "INSERT INTO sessions (token_hash, user_id, created_at, last_used_at) VALUES (?, ?, ?, ?)",
            (_hash(token), user_id, now, now),
        )
    return token


def user_for_token(conn: sqlite3.Connection, token: str) -> sqlite3.Row:
    """Resolve a bearer token to its user, or raise Unauthorized. Shared by REST and WebSocket."""
    token_hash = _hash(token)
    row = conn.execute(
        """SELECT u.*, s.last_used_at AS session_last_used_at
           FROM sessions s JOIN users u ON u.id = s.user_id
           WHERE s.token_hash = ?""",
        (token_hash,),
    ).fetchone()
    if row is None:
        raise Unauthorized("Invalid or expired session")

    now = clock.now_ms()
    idle_ms = now - row["session_last_used_at"]
    if idle_ms > SESSION_TTL_DAYS * DAY_MS:
        end_session(conn, token)
        raise Unauthorized("Invalid or expired session")
    if idle_ms > TOUCH_INTERVAL_MS:
        with conn:
            conn.execute("UPDATE sessions SET last_used_at = ? WHERE token_hash = ?", (now, token_hash))
    return row


def end_session(conn: sqlite3.Connection, token: str) -> None:
    with conn:
        conn.execute("DELETE FROM sessions WHERE token_hash = ?", (_hash(token),))
