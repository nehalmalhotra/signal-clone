from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import DATABASE_PATH
from app.db.connection import get_connection, init_db
from app.db.seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once before the server accepts requests: create the schema, seed if empty.
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_connection(DATABASE_PATH)
    try:
        init_db(conn)
        seed_if_empty(conn)
    finally:
        conn.close()
    yield


app = FastAPI(title="Signal Clone API", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
