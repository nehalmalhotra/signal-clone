from fastapi import APIRouter, Response
from starlette.concurrency import run_in_threadpool

from app.deps import CurrentUser, Db, Rt
from app.models.conversations import AddMembersBody, ConversationDetail, CreateGroupBody, RoleBody
from app.services import conversations, groups

router = APIRouter(prefix="/groups", tags=["groups"])

# Every change is `async`: after the service commits it, current members' open tabs are told to
# re-fetch the chat (a `conversation.updated` frame). The service call itself blocks on SQLite,
# so it goes to a worker thread.


@router.post("", status_code=201)
async def create_group(body: CreateGroupBody, user: CurrentUser, conn: Db, rt: Rt) -> ConversationDetail:
    conv_id = await run_in_threadpool(groups.create_group, conn, user["id"], body.name, body.member_ids)
    await rt.dispatcher.conversation_changed(conv_id)
    return await run_in_threadpool(conversations.get_detail, conn, conv_id, user["id"])


@router.post("/{group_id}/members")
async def add_members(group_id: int, body: AddMembersBody, user: CurrentUser, conn: Db,
                      rt: Rt) -> ConversationDetail:
    await run_in_threadpool(groups.add_members, conn, group_id, user["id"], body.user_ids)
    await rt.dispatcher.conversation_changed(group_id)
    return await run_in_threadpool(conversations.get_detail, conn, group_id, user["id"])


@router.delete("/{group_id}/members/{user_id}", status_code=204)
async def remove_member(group_id: int, user_id: int, user: CurrentUser, conn: Db, rt: Rt) -> Response:
    await run_in_threadpool(groups.remove_member, conn, group_id, user["id"], user_id)
    # The removed person is no longer a member, so name them explicitly.
    await rt.dispatcher.conversation_changed(group_id, also_notify=[user_id])
    return Response(status_code=204)


@router.patch("/{group_id}/members/{user_id}")
async def set_member_role(group_id: int, user_id: int, body: RoleBody, user: CurrentUser, conn: Db,
                          rt: Rt) -> ConversationDetail:
    await run_in_threadpool(groups.set_role, conn, group_id, user["id"], user_id, body.role)
    await rt.dispatcher.conversation_changed(group_id)
    return await run_in_threadpool(conversations.get_detail, conn, group_id, user["id"])
