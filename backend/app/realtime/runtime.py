"""The real-time pieces wired together. One instance per app, kept on app.state.realtime."""

from pathlib import Path

from app.realtime import events
from app.realtime.dispatcher import Dispatcher
from app.realtime.hub import Connection, Hub


class Realtime:
    def __init__(self, db_path: Path):
        self.hub = Hub()
        self.dispatcher = Dispatcher(self.hub, db_path)

    async def connected(self, conn: Connection) -> None:
        # `ready` goes out BEFORE the socket joins the hub, so no push can arrive ahead of it.
        # Contract for clients: after `ready`, re-fetch the chat list over REST; anything sent
        # while the tab was disconnected is picked up there, not replayed over the socket.
        await conn.send(events.ready(conn.user_id, online_user_ids=[]))
        self.hub.add(conn)
        await self.dispatcher.catch_up_delivered(conn.user_id)

    async def disconnected(self, conn: Connection) -> None:
        self.hub.remove(conn)
