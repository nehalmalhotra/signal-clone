"""FastAPI dependencies: things an endpoint asks for in its signature."""

import sqlite3
from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request

from app.db.connection import get_connection


def get_db(request: Request) -> Iterator[sqlite3.Connection]:
    # One connection per request, always closed. The path lives on app.state so tests
    # can point the app at a temporary database.
    conn = get_connection(request.app.state.db_path)
    try:
        yield conn
    finally:
        conn.close()


Db = Annotated[sqlite3.Connection, Depends(get_db)]
