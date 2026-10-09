"""Which sockets are open right now, and how to write to them."""

import asyncio
import logging

from fastapi import WebSocket

from app import config

log = logging.getLogger(__name__)


class Connection:
    """One open, authenticated socket, i.e. one browser tab."""

    def __init__(self, ws: WebSocket, user_id: int):
        self.ws = ws
        self.user_id = user_id
        # Two handlers can push to the same socket at once; the lock keeps frames from interleaving.
        self._write_lock = asyncio.Lock()
        self.typing_in: set[int] = set()  # chats this tab last said "typing" in (cleared on close)
        self.last_touch_ms = 0  # last time a ping rewrote last_seen_at

    async def send(self, event: dict) -> bool:
        """Write one event. True only if the frame was written within the send timeout.

        "Written" is as far as the server can see: it does not prove the tab rendered it (D-27).
        """
        try:
            async with self._write_lock:
                await asyncio.wait_for(self.ws.send_json(event), config.WS_SEND_TIMEOUT_S)
            return True
        except Exception:  # closed, reset or too slow; the receive loop notices and cleans up
            log.debug("push to user %s failed", self.user_id, exc_info=True)
            return False


class Hub:
    """In-memory map of user -> open sockets. One server process only (D-29)."""

    def __init__(self) -> None:
        self._by_user: dict[int, set[Connection]] = {}

    def add(self, conn: Connection) -> bool:
        """Register a socket. True if it is the user's first, i.e. they just came online."""
        first = conn.user_id not in self._by_user
        self._by_user.setdefault(conn.user_id, set()).add(conn)
        return first

    def remove(self, conn: Connection) -> bool:
        """Forget a socket. True if it was the user's last, i.e. they just went offline."""
        sockets = self._by_user.get(conn.user_id)
        if sockets is None or conn not in sockets:
            return False
        sockets.discard(conn)
        if not sockets:
            del self._by_user[conn.user_id]
            return True
        return False

    def is_online(self, user_id: int) -> bool:
        return user_id in self._by_user

    def online_among(self, user_ids: list[int]) -> list[int]:
        return [uid for uid in user_ids if uid in self._by_user]

    async def send_to_users(self, user_ids, event: dict, *, exclude: Connection | None = None) -> set[int]:
        """Push to every open socket of the given users, in parallel so one slow tab can't hold up
        the rest. Returns the users that received it on at least one socket."""
        targets = [c for uid in set(user_ids) for c in self._by_user.get(uid, ()) if c is not exclude]
        results = await asyncio.gather(*(c.send(event) for c in targets))
        return {c.user_id for c, ok in zip(targets, results) if ok}
