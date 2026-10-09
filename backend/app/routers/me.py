from fastapi import APIRouter, UploadFile

from app.deps import CurrentUser, Db, MediaDir
from app.models.users import Me, ProfileUpdate
from app.services import avatars, users

router = APIRouter(prefix="/me", tags=["me"])


@router.get("")
def get_me(user: CurrentUser) -> Me:
    return users.to_me(user)


@router.patch("")
def update_me(body: ProfileUpdate, user: CurrentUser, conn: Db) -> Me:
    # exclude_unset: a field that wasn't sent stays untouched; one sent as null is cleared.
    updated = users.update_profile(conn, user["id"], body.model_dump(exclude_unset=True))
    return users.to_me(updated)


@router.put("/avatar")
def upload_avatar(file: UploadFile, user: CurrentUser, conn: Db, media_dir: MediaDir) -> Me:
    # Read one byte past the limit so an oversize upload is detected without loading all of it.
    data = file.file.read(avatars.MAX_BYTES + 1)
    new_path = avatars.save(media_dir, user["id"], data)
    updated = users.set_avatar_path(conn, user["id"], new_path)
    avatars.delete(media_dir, user["avatar_path"])
    return users.to_me(updated)


@router.delete("/avatar")
def remove_avatar(user: CurrentUser, conn: Db, media_dir: MediaDir) -> Me:
    updated = users.set_avatar_path(conn, user["id"], None)
    avatars.delete(media_dir, user["avatar_path"])
    return users.to_me(updated)
