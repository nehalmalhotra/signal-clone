"use client";

import { useEffect, useRef } from "react";
import { sendRead } from "@/lib/ws/realtime";
import { useActiveConversation } from "@/store/activeConversation";
import { useChats } from "@/store/chats";
import { useMessages } from "@/store/messages";
import { useSession } from "@/store/session";

/** Sends `message.read` for the newest incoming message, but only while this chat is the one
 * open AND the tab is visible — the plan's "mark read only when the chat is open and the window
 * is visible". Re-runs on new messages, on visibility changes, and whenever this becomes the
 * active chat (which also covers a reconnect, since that re-fetches the message list). */
export function useMarkRead(conversationId: number) {
  const myId = useSession((s) => s.me?.id);
  const items = useMessages((s) => s.get(conversationId).items);
  const activeId = useActiveConversation((s) => s.id);
  // Avoids re-sending the same up_to_message_id on every unrelated store update (e.g. a receipt
  // arriving for one of MY OWN messages also changes `items`'s reference).
  const lastSentId = useRef(0);

  useEffect(() => {
    function tryMarkRead() {
      if (activeId !== conversationId) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      const newestIncoming = [...items].reverse().find((m) => m.sender_id !== myId && m.id > 0);
      if (!newestIncoming || newestIncoming.id <= lastSentId.current) return;

      lastSentId.current = newestIncoming.id;
      sendRead(conversationId, newestIncoming.id);
      useChats.getState().clearUnread(conversationId);
    }

    tryMarkRead();
    document.addEventListener("visibilitychange", tryMarkRead);
    return () => document.removeEventListener("visibilitychange", tryMarkRead);
  }, [conversationId, activeId, items, myId]);
}
