"""API shapes for users. These define the JSON the frontend sees, not the DB tables."""

from pydantic import BaseModel, Field

# Same format the seeded usernames follow: a nickname, a dot, and a numeric discriminator.
USERNAME_PATTERN = r"^[A-Za-z_][A-Za-z0-9_]{2,31}\.[0-9]{2,9}$"


class UserPublic(BaseModel):
    id: int
    given_name: str
    family_name: str | None
    username: str | None
    about: str | None
    avatar_url: str | None
    avatar_color: str
    last_seen_at: int | None


class Me(UserPublic):
    # Only the owner sees their own phone number.
    phone_number: str
    created_at: int


class ProfileUpdate(BaseModel):
    """PATCH body: only the fields that are sent change. null or "" clears an optional field."""

    given_name: str | None = Field(default=None, max_length=50)
    family_name: str | None = Field(default=None, max_length=50)
    about: str | None = Field(default=None, max_length=140)
    username: str | None = Field(default=None, pattern=USERNAME_PATTERN)
