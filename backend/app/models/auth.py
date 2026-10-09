import re
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, Field

from app.models.users import Me

# E.164-style: "+" then 7-15 digits.
PHONE_PATTERN = r"^\+[0-9]{7,15}$"

# NANP (+1, US/CA) and India (+91) have a fixed-length national number; reject anything shorter
# or longer instead of silently accepting it (matches the frontend's digits-only, max-10 input).
_FIXED_LENGTH_CALLING_CODES = {"1": 10, "91": 10}


def _validate_phone(v: str) -> str:
    for code, national_length in _FIXED_LENGTH_CALLING_CODES.items():
        prefix = f"+{code}"
        if v.startswith(prefix):
            national = v[len(prefix):]
            if not re.fullmatch(r"[0-9]+", national) or len(national) != national_length:
                raise ValueError(f"A +{code} number needs exactly {national_length} digits after the country code")
            return v
    return v


PhoneNumber = Annotated[str, Field(pattern=PHONE_PATTERN), AfterValidator(_validate_phone)]


class RequestCodeBody(BaseModel):
    phone_number: PhoneNumber


class RequestCodeResponse(BaseModel):
    code_sent: bool = True


class VerifyBody(BaseModel):
    phone_number: PhoneNumber
    code: str


class VerifyResponse(BaseModel):
    status: Literal["logged_in", "profile_required"]
    token: str | None = None
    user: Me | None = None


class RegisterBody(BaseModel):
    phone_number: PhoneNumber
    code: str
    given_name: str = Field(max_length=50)
    family_name: str | None = Field(default=None, max_length=50)


class SessionResponse(BaseModel):
    token: str
    user: Me
