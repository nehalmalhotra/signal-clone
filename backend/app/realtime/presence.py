"""Online / last-seen (mocked per the spec, D-12).

"Online" is never stored: it means "has at least one open authenticated socket", read from the hub.
last_seen_at is the one stored value, written:
- when a user's first socket connects,
- when their last socket closes (the moment they stop being online),
- on a ping, at most once per config.LAST_SEEN_TOUCH_INTERVAL_MS per tab. This bounds how stale
  the value is if the server dies before it can run the disconnect code.
"""

from app import clock, config
from app.realtime import events
from app.realtime.dispatcher import Dispatcher
from app.realtime.hub import Connection
from app.services import conversations, users


class Presence:
    def __init__(self, dispatcher: Dispatcher):
        self._dispatcher = dispatcher

    async def peers_of(self, user_id: int) -> list[int]:
        return await self._dispatcher.db(conversations.direct_peer_ids, user_id)

    async def went_online(self, user_id: int, peers: list[int]) -> None:
        now = clock.now_ms()
        await self._dispatcher.db(users.set_last_seen, user_id, now)
        await self._dispatcher.hub.send_to_users(peers, events.presence(user_id, True, now))

    async def went_offline(self, user_id: int) -> None:
        now = clock.now_ms()
        await self._dispatcher.db(users.set_last_seen, user_id, now)
        peers = await self.peers_of(user_id)
        await self._dispatcher.hub.send_to_users(peers, events.presence(user_id, False, now))

    async def touch(self, conn: Connection) -> None:
        """Called on every ping; writes only if this tab hasn't in the last interval."""
        now = clock.now_ms()
        if now - conn.last_touch_ms < config.LAST_SEEN_TOUCH_INTERVAL_MS:
            return
        conn.last_touch_ms = now
        await self._dispatcher.db(users.set_last_seen, conn.user_id, now)
