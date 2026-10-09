from fastapi import APIRouter, Response
from pydantic import BaseModel

from app.deps import CurrentUser, Db
from app.models.users import UserPublic
from app.services import contacts, users

router = APIRouter(prefix="/contacts", tags=["contacts"])


class AddContactBody(BaseModel):
    user_id: int


@router.get("")
def list_contacts(user: CurrentUser, conn: Db) -> list[UserPublic]:
    return [users.to_public(r) for r in contacts.list_contacts(conn, user["id"])]


@router.post("", status_code=201)
def add_contact(body: AddContactBody, user: CurrentUser, conn: Db, response: Response) -> UserPublic:
    contact, created = contacts.add_contact(conn, user["id"], body.user_id)
    if not created:
        response.status_code = 200
    return users.to_public(contact)
