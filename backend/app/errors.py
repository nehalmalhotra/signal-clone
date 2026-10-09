"""Domain errors raised by services. main.py maps each one to an HTTP status.

Services stay free of FastAPI imports, so the same service code can be called from a
REST route or (Phase 3) a WebSocket handler without caring how errors are reported.
"""


class AppError(Exception):
    status_code = 500

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


class BadRequest(AppError):
    status_code = 400


class Unauthorized(AppError):
    status_code = 401


class Forbidden(AppError):
    status_code = 403


class NotFound(AppError):
    status_code = 404


class Conflict(AppError):
    status_code = 409
