from fastapi import APIRouter, Response

from app.deps import CurrentUser, Db, Token
from app.models.auth import (RegisterBody, RequestCodeBody, RequestCodeResponse, SessionResponse,
                             VerifyBody, VerifyResponse)
from app.services import auth, users

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/request-code")
def request_code(body: RequestCodeBody) -> RequestCodeResponse:
    # Mocked: no SMS is sent. Every number's code is the fixed OTP (config.OTP_CODE).
    return RequestCodeResponse()


@router.post("/verify", response_model_exclude_none=True)
def verify(body: VerifyBody, conn: Db) -> VerifyResponse:
    auth.check_code(body.code)
    user = auth.find_user_by_phone(conn, body.phone_number)
    if user is None:
        return VerifyResponse(status="profile_required")
    return VerifyResponse(status="logged_in", token=auth.create_session(conn, user["id"]),
                          user=users.to_me(user))


@router.post("/register", status_code=201)
def register(body: RegisterBody, conn: Db) -> SessionResponse:
    # The code is checked again: the server keeps no "this number was verified" state.
    auth.check_code(body.code)
    user = auth.register(conn, body.phone_number, body.given_name, body.family_name)
    return SessionResponse(token=auth.create_session(conn, user["id"]), user=users.to_me(user))


@router.post("/logout", status_code=204)
def logout(_: CurrentUser, conn: Db, token: Token) -> Response:
    auth.end_session(conn, token)
    return Response(status_code=204)
