from fastapi import APIRouter, Query, Response

from app.deps import CurrentUser, Db
from app.models.messages import (MarkReadBody, MarkReadResponse, Message, MessagePage, Receipt,
                                 SendMessageBody)
from app.services import messages

router = APIRouter(tags=["messages"])


@router.get("/conversations/{conversation_id}/messages")
def list_messages(conversation_id: int, user: CurrentUser, conn: Db,
                  before_id: int | None = None, limit: int = Query(50, ge=1, le=100)) -> MessagePage:
    page, has_more = messages.list_messages(conn, conversation_id, user["id"], before_id, limit)
    return MessagePage(messages=page, has_more=has_more)


@router.post("/conversations/{conversation_id}/messages", status_code=201)
def send_message(conversation_id: int, body: SendMessageBody, user: CurrentUser, conn: Db,
                 response: Response) -> Message:
    message, created = messages.create_message(conn, conversation_id, user["id"], body.client_id, body.body)
    if not created:
        response.status_code = 200  # a retry of an already-stored send
    return message


@router.post("/conversations/{conversation_id}/read")
def mark_read(conversation_id: int, body: MarkReadBody, user: CurrentUser, conn: Db) -> MarkReadResponse:
    ids = messages.mark_read(conn, conversation_id, user["id"], body.up_to_message_id)
    return MarkReadResponse(updated=len(ids))


@router.get("/messages/{message_id}/receipts")
def message_receipts(message_id: int, user: CurrentUser, conn: Db) -> list[Receipt]:
    return messages.receipts_for(conn, message_id, user["id"])
