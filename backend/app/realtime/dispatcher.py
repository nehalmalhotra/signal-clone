"""What happens when something occurs: call the shared services, then push the results.

The same methods serve WebSocket events and REST endpoints, so a message sent either way
reaches everyone the same way (D-28).
"""

import sqlite3
from collections import defaultdict
from pathlib import Path

from starlette.concurrency import run_in_threadpool

from app import clock
from app.db.connection import get_connection
from app.realtime import events
from app.realtime.hub import Connection, Hub
from app.services import membership, messages


class Dispatcher:
    def __init__(self, hub: Hub, db_path: Path):
        self.hub = hub
        self.db_path = db_path

    async def db(self, fn, *args):
        """Run a blocking service function on a worker thread with its own connection.

        SQLite calls block. Running them directly in a socket handler would freeze every other
        socket on this event loop while one query waits (up to busy_timeout, 5 s) for a lock.
        """
        return await run_in_threadpool(self._call, fn, args)

    def _call(self, fn, args):
        conn: sqlite3.Connection = get_connection(self.db_path)
        try:
            return fn(conn, *args)
        finally:
            conn.close()

    # --- sending -----------------------------------------------------------------

    async def send_message(self, conn: Connection, conversation_id: int, client_id: str, body: str) -> None:
        message, created = await self.db(messages.create_message, conversation_id, conn.user_id, client_id, body)
        # Ack first: the sender's bubble moves from "sending" to "sent" without waiting for fan-out.
        await conn.send(events.ack(client_id, message))
        if created:
            await self.publish_new_message(message, origin=conn)
        else:
            # A resend of a stored message. The first attempt may have died between "stored" and
            # "pushed" (crash, cancelled task), so push to whoever is still waiting. Recipients who
            # already got it are at 'delivered' or beyond and see nothing twice.
            await self.republish_undelivered(message)

    async def publish_new_message(self, message: dict, origin: Connection | None = None) -> None:
        """Push a stored message to its recipients, then mark it delivered for those it reached."""
        sender_id = message["sender_id"]
        members = await self.db(membership.active_member_ids, message["conversation_id"])
        recipients = [uid for uid in members if uid != sender_id]

        # Recipients see someone else's message: no bubble status of their own.
        reached = await self.hub.send_to_users(recipients, events.new_message({**message, "status": None}))
        # The sender's other tabs show it too (the origin tab already has the ack).
        await self.hub.send_to_users([sender_id], events.new_message(message), exclude=origin)
        if reached:
            await self._mark_delivered(message, reached)

    async def republish_undelivered(self, message: dict) -> None:
        waiting = await self.db(messages.undelivered_recipient_ids, message["id"])
        if not waiting:
            return
        reached = await self.hub.send_to_users(waiting, events.new_message({**message, "status": None}))
        if reached:
            await self._mark_delivered(message, reached)

    async def _mark_delivered(self, message: dict, user_ids: set[int]) -> None:
        now = clock.now_ms()
        changed = await self.db(messages.mark_delivered, message["id"], sorted(user_ids), now)
        for uid in changed:
            update = events.receipt_update(message["conversation_id"], [message["id"]], uid, "delivered", now)
            await self.hub.send_to_users([message["sender_id"]], update)

    async def catch_up_delivered(self, user_id: int) -> None:
        """The user just connected: whatever was waiting for them counts as delivered now."""
        now = clock.now_ms()
        rows = await self.db(messages.mark_all_delivered, user_id, now)
        grouped: dict[tuple[int, int], list[int]] = defaultdict(list)  # (sender, chat) -> message ids
        for message_id, conversation_id, sender_id in rows:
            grouped[(sender_id, conversation_id)].append(message_id)
        for (sender_id, conversation_id), ids in grouped.items():
            await self.hub.send_to_users([sender_id],
                                         events.receipt_update(conversation_id, ids, user_id, "delivered", now))

    # --- reading -----------------------------------------------------------------

    async def mark_read(self, conn: Connection | None, user_id: int, conversation_id: int,
                        up_to_message_id: int) -> int:
        """Mark messages read and tell their senders. Returns how many changed."""
        now = clock.now_ms()
        changed = await self.db(messages.mark_read, conversation_id, user_id, up_to_message_id, now)
        await self.publish_read(conn, user_id, conversation_id, up_to_message_id, changed, now)
        return len(changed)

    async def publish_read(self, origin: Connection | None, reader_id: int, conversation_id: int,
                           up_to_message_id: int, changed: list[tuple[int, int]], now: int) -> None:
        if not changed:
            return
        by_sender: dict[int, list[int]] = defaultdict(list)
        for message_id, sender_id in changed:
            by_sender[sender_id].append(message_id)
        for sender_id, ids in by_sender.items():
            await self.hub.send_to_users([sender_id],
                                         events.receipt_update(conversation_id, ids, reader_id, "read", now))
        # The reader's other tabs clear their unread badge.
        await self.hub.send_to_users([reader_id], events.read_sync(conversation_id, up_to_message_id),
                                     exclude=origin)
