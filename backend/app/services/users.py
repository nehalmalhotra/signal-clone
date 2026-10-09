import sqlite3

from app.errors import BadRequest, Conflict, NotFound

_PROFILE_COLUMNS = ("given_name", "family_name", "about", "username")


def to_public(row: sqlite3.Row) -> dict:
    """Row -> UserPublic fields. Never includes the phone number."""
    return {
        "id": row["id"],
        "given_name": row["given_name"],
        "family_name": row["family_name"],
        "username": row["username"],
        "about": row["about"],
        "avatar_url": f"/media/{row['avatar_path']}" if row["avatar_path"] else None,
        "avatar_color": row["avatar_color"],
        "last_seen_at": row["last_seen_at"],
    }


def to_me(row: sqlite3.Row) -> dict:
    return {**to_public(row), "phone_number": row["phone_number"], "created_at": row["created_at"]}


def display_name(row: sqlite3.Row) -> str:
    return " ".join(p for p in (row["given_name"], row["family_name"]) if p)


def get_user(conn: sqlite3.Connection, user_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise NotFound("User not found")
    return row


def lookup(conn: sqlite3.Connection, query: str) -> sqlite3.Row:
    """Exact match on phone number (starts with +) or username; never a fuzzy search."""
    query = query.strip()
    column = "phone_number" if query.startswith("+") else "username"  # username is NOCASE
    row = conn.execute(f"SELECT * FROM users WHERE {column} = ?", (query,)).fetchone()
    if row is None:
        raise NotFound("No user found")
    return row


def update_profile(conn: sqlite3.Connection, user_id: int, changes: dict) -> sqlite3.Row:
    values = {}
    for key, value in changes.items():
        if key not in _PROFILE_COLUMNS:
            continue
        value = value.strip() if isinstance(value, str) else value
        values[key] = value or None  # "" clears an optional field
    if "given_name" in values and values["given_name"] is None:
        raise BadRequest("Name can't be empty")
    if values:
        assignments = ", ".join(f"{k} = ?" for k in values)  # keys come from the whitelist above
        try:
            with conn:
                conn.execute(f"UPDATE users SET {assignments} WHERE id = ?", (*values.values(), user_id))
        except sqlite3.IntegrityError:
            raise Conflict("That username is taken") from None
    return get_user(conn, user_id)


def set_avatar_path(conn: sqlite3.Connection, user_id: int, avatar_path: str | None) -> sqlite3.Row:
    with conn:
        conn.execute("UPDATE users SET avatar_path = ? WHERE id = ?", (avatar_path, user_id))
    return get_user(conn, user_id)



def set_last_seen(conn: sqlite3.Connection, user_id: int, at: int) -> None:
    with conn:
        conn.execute("UPDATE users SET last_seen_at = ? WHERE id = ?", (at, user_id))
