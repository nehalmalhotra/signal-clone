"""One function per client event. Parsing and error reporting live here; the work is in the dispatcher."""

from pydantic import ValidationError

from app.errors import AppError
from app.realtime import events
from app.realtime.hub import Connection
from app.realtime.runtime import Realtime


async def handle(rt: Realtime, conn: Connection, raw: object) -> None:
    """Process one frame. Any problem becomes an `error` frame; the socket stays open."""
    try:
        event = events.parse_client_event(raw)
    except ValidationError as exc:
        client_id = raw.get("client_id") if isinstance(raw, dict) and isinstance(raw.get("client_id"), str) else None
        await conn.send(events.error("invalid_event", _first_problem(exc), client_id))
        return

    try:
        if isinstance(event, events.SendEvent):
            await rt.dispatcher.send_message(conn, event.conversation_id, event.client_id, event.body)
        elif isinstance(event, events.ReadEvent):
            await rt.dispatcher.mark_read(conn, conn.user_id, event.conversation_id, event.up_to_message_id)
        elif isinstance(event, events.TypingEvent):
            await rt.typing.handle(conn, event.conversation_id, event.typing)
        elif isinstance(event, events.PingEvent):
            await rt.presence.touch(conn)
            await conn.send(events.pong())
        else:  # AuthEvent after the handshake
            await conn.send(events.error("invalid_event", "Already authenticated"))
    except AppError as exc:
        await conn.send(events.error_from(exc, getattr(event, "client_id", None)))


def _first_problem(exc: ValidationError) -> str:
    err = exc.errors()[0]
    # Pydantic prefixes the path with the event's tag; the client already knows which event it sent.
    where = ".".join(str(p) for p in err["loc"] if p not in events.CLIENT_EVENT_TYPES)
    return f"{where}: {err['msg']}" if where else err["msg"]
