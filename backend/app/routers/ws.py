"""The /ws endpoint: accept, authenticate with the first frame, then loop on incoming events."""

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app import config
from app.errors import Unauthorized
from app.realtime import events, handlers
from app.realtime.hub import Connection
from app.realtime.runtime import Realtime
from app.services import auth

router = APIRouter()

# Close codes in the 4000-4999 range are free for applications to define.
CLOSE_UNAUTHORIZED = 4401  # bad/expired token or first frame wasn't a valid auth: don't retry, log in again
CLOSE_TIMEOUT = 4408  # no auth in time, or no frames at all for too long: reconnecting is fine


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    rt: Realtime = websocket.app.state.realtime
    # A browser can't set an Authorization header on a WebSocket, and a token in the URL ends
    # up in server logs. So: accept first, then the first frame must carry the token (D-26).
    await websocket.accept()
    user = await _authenticate(websocket, rt)
    if user is None:
        return

    conn = Connection(websocket, user["id"])
    try:
        await rt.connected(conn)
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_json(), config.WS_IDLE_TIMEOUT_S)
            except (ValueError, KeyError):  # not JSON, or a binary frame
                await conn.send(events.error("invalid_event", "Frames must be JSON text"))
                continue
            await handlers.handle(rt, conn, raw)
    except WebSocketDisconnect:
        pass
    except asyncio.TimeoutError:
        await websocket.close(CLOSE_TIMEOUT, "Idle")
    finally:
        # Always runs, so a dropped tab can never leave its user stuck "online". Shielded: if this
        # task is cancelled (server shutdown, a test client closing), the cleanup still finishes
        # as its own task instead of stopping halfway and skipping the offline/last_seen update.
        await asyncio.shield(rt.disconnected(conn))


async def _authenticate(websocket: WebSocket, rt: Realtime):
    try:
        raw = await asyncio.wait_for(websocket.receive_json(), config.WS_AUTH_TIMEOUT_S)
        event = events.parse_client_event(raw)
        if not isinstance(event, events.AuthEvent):
            raise ValueError("first frame must be auth")
        return await rt.dispatcher.db(auth.user_for_token, event.token)
    except asyncio.TimeoutError:
        await websocket.close(CLOSE_TIMEOUT, "Authentication timed out")
    except WebSocketDisconnect:
        pass
    except (ValueError, KeyError):  # pydantic's ValidationError is a ValueError
        await websocket.close(CLOSE_UNAUTHORIZED, "Send an auth frame first")
    except Unauthorized:
        await websocket.close(CLOSE_UNAUTHORIZED, "Invalid or expired session")
    return None
