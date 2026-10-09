from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import CORS_ORIGINS, DATABASE_PATH, MEDIA_DIR
from app.db.connection import get_connection, init_db
from app.db.seed import seed_if_empty
from app.errors import AppError
from app.realtime.runtime import Realtime
from app.routers import auth, contacts, conversations, groups, me, messages, users, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once before the server accepts requests: create the schema, seed if empty.
    # Paths are read from this module's globals at startup so tests can monkeypatch them.
    app.state.db_path = DATABASE_PATH
    app.state.media_dir = MEDIA_DIR
    app.state.realtime = Realtime(DATABASE_PATH)
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    (MEDIA_DIR / "avatars").mkdir(parents=True, exist_ok=True)
    conn = get_connection(DATABASE_PATH)
    try:
        init_db(conn)
        seed_if_empty(conn)
    finally:
        conn.close()
    yield


app = FastAPI(title="Signal Clone API", lifespan=lifespan)

# The browser blocks Vercel -> Railway calls unless the API lists the page's origin.
# Auth is a bearer header, not a cookie, so credentials mode is not needed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(AppError)
async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
    headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=headers)


app.include_router(auth.router)
app.include_router(me.router)
app.include_router(users.router)
app.include_router(contacts.router)
app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(groups.router)
app.include_router(ws.router)

# Avatars are public files (random names, like Signal's CDN URLs). check_dir=False because
# the directory is created in lifespan, after this line runs.
app.mount("/media", StaticFiles(directory=MEDIA_DIR, check_dir=False), name="media")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
