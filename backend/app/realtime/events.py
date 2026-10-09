"""The WebSocket vocabulary. Every frame is JSON: {"type": "...", ...payload}.

Client -> server frames are validated by the models below; server -> client frames are built
by the functions below so every event has exactly one definition.
"""

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field, TypeAdapter

from app.errors import AppError

# --- client -> server ------------------------------------------------------------


class AuthEvent(BaseModel):
    type: Literal["auth"]
    token: str


class SendEvent(BaseModel):
    type: Literal["message.send"]
    conversation_id: int
    client_id: str = Field(min_length=1, max_length=64)
    body: str = Field(min_length=1, max_length=10_000)


class ReadEvent(BaseModel):
    type: Literal["message.read"]
    conversation_id: int
    up_to_message_id: int


class TypingEvent(BaseModel):
    type: Literal["typing"]
    conversation_id: int
    typing: bool


class PingEvent(BaseModel):
    type: Literal["ping"]


ClientEvent = Annotated[Union[AuthEvent, SendEvent, ReadEvent, TypingEvent, PingEvent],
                        Field(discriminator="type")]
parse_client_event = TypeAdapter(ClientEvent).validate_python
CLIENT_EVENT_TYPES = {"auth", "message.send", "message.read", "typing", "ping"}

# --- server -> client ------------------------------------------------------------

_ERROR_CODES = {400: "bad_request", 401: "unauthorized", 403: "forbidden", 404: "not_found", 409: "conflict"}


def ready(user_id: int, online_user_ids: list[int]) -> dict:
    return {"type": "ready", "user_id": user_id, "online_user_ids": online_user_ids}


def ack(client_id: str, message: dict) -> dict:
    """Reply to message.send: the server stored it (one tick). Resending returns the same ack."""
    return {"type": "message.ack", "client_id": client_id, "message": message}


def new_message(message: dict) -> dict:
    return {"type": "message.new", "message": message}


def receipt_update(conversation_id: int, message_ids: list[int], user_id: int, status: str, at: int) -> dict:
    """`user_id` (the recipient) moved these messages to `status`. Sent to the messages' sender."""
    return {"type": "receipt.update", "conversation_id": conversation_id,
            "message_ids": message_ids, "user_id": user_id, "status": status, "at": at}


def read_sync(conversation_id: int, up_to_message_id: int) -> dict:
    """Tells the reader's OTHER tabs to clear their unread badge."""
    return {"type": "read.sync", "conversation_id": conversation_id, "up_to_message_id": up_to_message_id}


def typing(conversation_id: int, user_id: int, is_typing: bool) -> dict:
    return {"type": "typing", "conversation_id": conversation_id, "user_id": user_id, "typing": is_typing}


def presence(user_id: int, online: bool, last_seen_at: int | None) -> dict:
    return {"type": "presence", "user_id": user_id, "online": online, "last_seen_at": last_seen_at}


def conversation_updated(conversation_id: int) -> dict:
    """Membership, roles or the timeline of a chat changed: re-fetch it over REST."""
    return {"type": "conversation.updated", "conversation_id": conversation_id}


def error(code: str, detail: str, client_id: str | None = None) -> dict:
    event = {"type": "error", "code": code, "detail": detail}
    if client_id is not None:
        event["client_id"] = client_id  # lets the client mark that exact send as failed
    return event


def error_from(exc: AppError, client_id: str | None = None) -> dict:
    return error(_ERROR_CODES.get(exc.status_code, "error"), exc.detail, client_id)


def pong() -> dict:
    return {"type": "pong"}
