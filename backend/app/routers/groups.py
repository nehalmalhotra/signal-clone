from fastapi import APIRouter, Response

from app.deps import CurrentUser, Db
from app.models.conversations import AddMembersBody, ConversationDetail, CreateGroupBody, RoleBody
from app.services import conversations, groups

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", status_code=201)
def create_group(body: CreateGroupBody, user: CurrentUser, conn: Db) -> ConversationDetail:
    conv_id = groups.create_group(conn, user["id"], body.name, body.member_ids)
    return conversations.get_detail(conn, conv_id, user["id"])


@router.post("/{group_id}/members")
def add_members(group_id: int, body: AddMembersBody, user: CurrentUser, conn: Db) -> ConversationDetail:
    groups.add_members(conn, group_id, user["id"], body.user_ids)
    return conversations.get_detail(conn, group_id, user["id"])


@router.delete("/{group_id}/members/{user_id}", status_code=204)
def remove_member(group_id: int, user_id: int, user: CurrentUser, conn: Db) -> Response:
    groups.remove_member(conn, group_id, user["id"], user_id)
    return Response(status_code=204)


@router.patch("/{group_id}/members/{user_id}")
def set_member_role(group_id: int, user_id: int, body: RoleBody, user: CurrentUser,
                    conn: Db) -> ConversationDetail:
    groups.set_role(conn, group_id, user["id"], user_id, body.role)
    return conversations.get_detail(conn, group_id, user["id"])
