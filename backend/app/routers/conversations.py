from fastapi import APIRouter, Response

from app.deps import CurrentUser, Db
from app.models.conversations import ConversationDetail, ConversationSummary, DirectBody
from app.services import conversations

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("")
def list_conversations(user: CurrentUser, conn: Db) -> list[ConversationSummary]:
    return conversations.list_for_user(conn, user["id"])


@router.post("/direct", status_code=201)
def open_direct(body: DirectBody, user: CurrentUser, conn: Db, response: Response) -> ConversationSummary:
    summary, created = conversations.get_or_create_direct(conn, user["id"], body.user_id)
    if not created:
        response.status_code = 200
    return summary


@router.get("/{conversation_id}")
def get_conversation(conversation_id: int, user: CurrentUser, conn: Db) -> ConversationDetail:
    return conversations.get_detail(conn, conversation_id, user["id"])
