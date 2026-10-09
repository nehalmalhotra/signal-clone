from typing import Literal

from pydantic import BaseModel, Field

from app.models.users import Me

# E.164-style: "+" then 7-15 digits.
PHONE_PATTERN = r"^\+[0-9]{7,15}$"


class RequestCodeBody(BaseModel):
    phone_number: str = Field(pattern=PHONE_PATTERN)


class RequestCodeResponse(BaseModel):
    code_sent: bool = True


class VerifyBody(BaseModel):
    phone_number: str = Field(pattern=PHONE_PATTERN)
    code: str


class VerifyResponse(BaseModel):
    status: Literal["logged_in", "profile_required"]
    token: str | None = None
    user: Me | None = None


class RegisterBody(BaseModel):
    phone_number: str = Field(pattern=PHONE_PATTERN)
    code: str
    given_name: str = Field(max_length=50)
    family_name: str | None = Field(default=None, max_length=50)


class SessionResponse(BaseModel):
    token: str
    user: Me
