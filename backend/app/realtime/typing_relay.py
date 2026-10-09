"""Typing indicators: relayed to the other members, never stored.

Flood control has three layers:
1. The client sends "started" once, repeats it every 10 s while typing continues, and sends
   "stopped" after 3 s of silence (Signal's own timings, design-tokens.md).
2. This relay drops a repeated "started" for the same chat arriving faster than
   config.TYPING_MIN_INTERVAL_S, so a buggy or hostile client can't make one keystroke a broadcast.
   "stopped" is never dropped: a stuck "typing..." is worse than a few extra frames.
3. The receiving client hides the indicator 15 s after the last "started", so a lost "stopped"
   can't leave it on screen forever.
"""

import logging
import time

from app import config
from app.realtime import events
from app.realtime.dispatcher import Dispatcher
from app.realtime.hub import Connection
from app.services import membership

log = logging.getLogger(__name__)


class TypingRelay:
    def __init__(self, dispatcher: Dispatcher):
        self._dispatcher = dispatcher
        self._last_started: dict[tuple[int, int], float] = {}  # (user, chat) -> monotonic seconds

    async def handle(self, conn: Connection, conversation_id: int, is_typing: bool) -> None:
        key = (conn.user_id, conversation_id)
        if is_typing:
            now = time.monotonic()
            last = self._last_started.get(key)
            if last is not None and now - last < config.TYPING_MIN_INTERVAL_S:
                return  # cheap in-memory drop, before touching the DB
            self._last_started[key] = now
        else:
            self._last_started.pop(key, None)

        # Raises NotFound/Forbidden for outsiders and removed members, so typing can't leak into a chat.
        audience = await self._dispatcher.db(membership.other_active_member_ids, conversation_id, conn.user_id)
        (conn.typing_in.add if is_typing else conn.typing_in.discard)(conversation_id)
        await self._dispatcher.hub.send_to_users(audience, events.typing(conversation_id, conn.user_id, is_typing))

    async def connection_closed(self, conn: Connection) -> None:
        """The tab vanished mid-sentence: tell the others it stopped, instead of leaving them
        to wait for their 15 s timeout."""
        for conversation_id in list(conn.typing_in):
            self._last_started.pop((conn.user_id, conversation_id), None)
            try:
                audience = await self._dispatcher.db(membership.other_active_member_ids,
                                                     conversation_id, conn.user_id)
                await self._dispatcher.hub.send_to_users(
                    audience, events.typing(conversation_id, conn.user_id, False))
            except Exception:  # best effort: the receiver's own timeout is the backstop
                log.debug("typing cleanup failed", exc_info=True)
        conn.typing_in.clear()
