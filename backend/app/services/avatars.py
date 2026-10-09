"""Avatar files on disk. The DB stores only the relative path (users.avatar_path)."""

import secrets
from pathlib import Path

from app.errors import BadRequest

MAX_BYTES = 5 * 1024 * 1024

# Sniff the first bytes instead of trusting the client's Content-Type header.
_SIGNATURES = (
    (b"\x89PNG\r\n\x1a\n", 0, ".png"),
    (b"\xff\xd8\xff", 0, ".jpg"),
    (b"RIFF", 0, ".webp"),  # also needs "WEBP" at offset 8, checked below
)


def _extension_for(data: bytes) -> str:
    for magic, offset, ext in _SIGNATURES:
        if data[offset:offset + len(magic)] == magic:
            if ext == ".webp" and data[8:12] != b"WEBP":
                continue
            return ext
    raise BadRequest("Avatar must be a PNG, JPEG or WebP image")


def save(media_dir: Path, user_id: int, data: bytes) -> str:
    """Write the image and return its path relative to media_dir."""
    if len(data) > MAX_BYTES:
        raise BadRequest("Avatar must be 5 MB or smaller")
    ext = _extension_for(data)
    # A fresh random name on every upload, so browsers never show a cached old avatar.
    relative = f"avatars/{user_id}-{secrets.token_hex(4)}{ext}"
    (media_dir / relative).write_bytes(data)
    return relative


def delete(media_dir: Path, relative: str | None) -> None:
    if relative:
        (media_dir / relative).unlink(missing_ok=True)
