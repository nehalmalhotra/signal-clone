from typing import Literal

from pydantic import BaseModel, Field

from app.models.messages import Message
from app.models.users import UserPublic


class ConversationSummary(BaseModel):
    """One row of the chat list."""

    id: int
    type: Literal["direct", "group"]
    title: str  # group name, or the other person's name for a direct chat
    avatar_url: str | None
    avatar_color: str
    peer: UserPublic | None  # the other person in a direct chat; null for groups
    member_count: int
    is_member: bool  # false after being removed: history stays readable, sending doesn't
    last_message: Message | None
    unread_count: int
    last_activity_at: int  # last message time, or creation time for an empty chat


class Member(BaseModel):
    user: UserPublic
    role: Literal["admin", "member"]
    joined_at: int


class ConversationDetail(ConversationSummary):
    my_role: Literal["admin", "member"] | None  # null once removed
    members: list[Member]  # active members only


class DirectBody(BaseModel):
    user_id: int


class CreateGroupBody(BaseModel):
    name: str = Field(min_length=1, max_length=32)  # Signal's limit (design-tokens.md)
    member_ids: list[int] = Field(min_length=1, max_length=1000)


class AddMembersBody(BaseModel):
    user_ids: list[int] = Field(min_length=1, max_length=1000)


class RoleBody(BaseModel):
    role: Literal["admin", "member"]
