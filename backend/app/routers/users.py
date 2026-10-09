from fastapi import APIRouter

from app.deps import CurrentUser, Db
from app.models.users import UserPublic
from app.services import users

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/lookup")
def lookup_user(query: str, _: CurrentUser, conn: Db) -> UserPublic:
    """Find one person by exact phone number or username (Signal's "Find by ...")."""
    return users.to_public(users.lookup(conn, query))
