"""The real-time pieces wired together. One instance per app, kept on app.state.realtime."""

import logging
from pathlib import Path

from app import clock
from app.realtime import events
from app.realtime.dispatcher import Dispatcher
from app.realtime.hub import Connection, Hub
from app.realtime.presence import Presence
from app.realtime.typing_relay import TypingRelay

log = logging.getLogger(__name__)


class Realtime:
    def __init__(self, db_path: Path):
        self.hub = Hub()
        self.dispatcher = Dispatcher(self.hub, db_path)
        self.presence = Presence(self.dispatcher)
        self.typing = TypingRelay(self.dispatcher)

    async def connected(self, conn: Connection) -> None:
        conn.last_touch_ms = clock.now_ms()
        peers = await self.presence.peers_of(conn.user_id)
        # `ready` goes out BEFORE the socket joins the hub, so no push can arrive ahead of it.
        # Contract for clients: after `ready`, re-fetch the chat list over REST; anything sent
        # while the tab was disconnected is picked up there, not replayed over the socket.
        await conn.send(events.ready(conn.user_id, self.hub.online_among(peers)))
        if self.hub.add(conn):  # first tab: the user just came online
            await self.presence.went_online(conn.user_id, peers)
        await self.dispatcher.catch_up_delivered(conn.user_id)

    async def disconnected(self, conn: Connection) -> None:
        # Leave the hub first: whatever fails below, this socket must never count as online again.
        went_offline = self.hub.remove(conn)
        try:
            await self.typing.connection_closed(conn)
            if went_offline:
                await self.presence.went_offline(conn.user_id)
        except Exception:
            log.exception("cleanup after disconnect failed for user %s", conn.user_id)
