import sqlite3

from app import clock
from app.errors import BadRequest
from app.services import users


def list_contacts(conn: sqlite3.Connection, owner_id: int) -> list[sqlite3.Row]:
    return conn.execute(
        """SELECT u.* FROM contacts c JOIN users u ON u.id = c.contact_id
           WHERE c.owner_id = ?
           ORDER BY u.given_name COLLATE NOCASE, u.family_name COLLATE NOCASE""",
        (owner_id,),
    ).fetchall()


def add_contact(conn: sqlite3.Connection, owner_id: int, contact_id: int) -> tuple[sqlite3.Row, bool]:
    """Returns (user, created). Adding someone twice is a no-op, not an error (idempotent)."""
    if owner_id == contact_id:
        raise BadRequest("You can't add yourself as a contact")
    contact = users.get_user(conn, contact_id)  # NotFound if the id doesn't exist
    with conn:
        cur = conn.execute(
            "INSERT OR IGNORE INTO contacts (owner_id, contact_id, created_at) VALUES (?, ?, ?)",
            (owner_id, contact_id, clock.now_ms()),
        )
    return contact, cur.rowcount == 1
