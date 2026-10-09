from fastapi import APIRouter, Query, Response

from app.deps import CurrentUser, Db, Rt
from app.models.messages import (MarkReadBody, MarkReadResponse, Message, MessagePage, Receipt,
                                 SendMessageBody)
from app.services import messages

router = APIRouter(tags=["messages"])


@router.get("/conversations/{conversation_id}/messages")
def list_messages(conversation_id: int, user: CurrentUser, conn: Db,
                  before_id: int | None = None, limit: int = Query(50, ge=1, le=100)) -> MessagePage:
    page, has_more = messages.list_messages(conn, conversation_id, user["id"], before_id, limit)
    return MessagePage(messages=page, has_more=has_more)


# The two writes below are `async` so they can push to open sockets before answering: a message
# sent over REST must reach a recipient's live tab exactly like one sent over the WebSocket.
@router.post("/conversations/{conversation_id}/messages", status_code=201)
async def send_message(conversation_id: int, body: SendMessageBody, user: CurrentUser, rt: Rt,
                       response: Response) -> Message:
    message, created = await rt.dispatcher.send_message_rest(user["id"], conversation_id, body.client_id,
                                                             body.body)
    if not created:
        response.status_code = 200  # a retry of an already-stored send
    return message


@router.post("/conversations/{conversation_id}/read")
async def mark_read(conversation_id: int, body: MarkReadBody, user: CurrentUser, rt: Rt) -> MarkReadResponse:
    updated = await rt.dispatcher.mark_read(None, user["id"], conversation_id, body.up_to_message_id)
    return MarkReadResponse(updated=updated)


@router.get("/messages/{message_id}/receipts")
def message_receipts(message_id: int, user: CurrentUser, conn: Db) -> list[Receipt]:
    return messages.receipts_for(conn, message_id, user["id"])
