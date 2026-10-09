"""FastAPI dependencies: things an endpoint asks for in its signature."""

import sqlite3
from collections.abc import Iterator
from pathlib import Path
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db.connection import get_connection
from app.errors import Unauthorized
from app.realtime.runtime import Realtime
from app.services import auth as auth_service


def get_db(request: Request) -> Iterator[sqlite3.Connection]:
    # One connection per request, always closed. The path lives on app.state so tests
    # can point the app at a temporary database.
    conn = get_connection(request.app.state.db_path)
    try:
        yield conn
    finally:
        conn.close()


Db = Annotated[sqlite3.Connection, Depends(get_db)]

# auto_error=False so a missing header goes through our own Unauthorized (401 + same JSON shape).
_bearer = HTTPBearer(auto_error=False)


def get_token(creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]) -> str:
    if creds is None:
        raise Unauthorized("Not authenticated")
    return creds.credentials


Token = Annotated[str, Depends(get_token)]


def get_current_user(conn: Db, token: Token) -> sqlite3.Row:
    return auth_service.user_for_token(conn, token)


CurrentUser = Annotated[sqlite3.Row, Depends(get_current_user)]


def get_media_dir(request: Request) -> Path:
    return request.app.state.media_dir


MediaDir = Annotated[Path, Depends(get_media_dir)]


def get_realtime(request: Request) -> Realtime:
    return request.app.state.realtime


Rt = Annotated[Realtime, Depends(get_realtime)]
