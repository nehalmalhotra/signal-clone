import sqlite3
from pathlib import Path

from app.config import DATABASE_PATH

SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def get_connection(db_path: Path | str = DATABASE_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # SQLite ignores REFERENCES clauses unless this is switched on for each connection.
    conn.execute("PRAGMA foreign_keys = ON")
    # WAL lets HTTP and WebSocket handlers keep reading while another request writes.
    conn.execute("PRAGMA journal_mode = WAL")
    # Wait for a competing writer's lock instead of failing at once with "database is locked".
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    """Create tables and indexes. Safe to run on every start (IF NOT EXISTS)."""
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
