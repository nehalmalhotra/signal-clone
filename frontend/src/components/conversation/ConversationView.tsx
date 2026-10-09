"use client";

import { useEffect, useMemo, useState } from "react";
import { ConversationHeader } from "./ConversationHeader";
import { Composer } from "./Composer";
import { Timeline } from "./Timeline";
import { useMarkRead } from "@/hooks/useMarkRead";
import { computeUnreadAnchor } from "@/lib/timeline";
import type { ConversationSummary } from "@/lib/types";
import { useActiveConversation } from "@/store/activeConversation";
import { useMessages } from "@/store/messages";
import { useSession } from "@/store/session";
import { EMPTY_TYPING, useTyping } from "@/store/typing";

/** The whole chat screen: header, scrollable message list, composer. page.tsx mounts this with
 * `key={conversation.id}` so switching chats always starts from a clean slate (scroll position,
 * the frozen unread-divider anchor, etc.) instead of carrying state from the previous chat. */
export function ConversationView({ conversation }: { conversation: ConversationSummary }) {
  const myId = useSession((s) => s.me?.id);
  const convState = useMessages((s) => s.get(conversation.id));
  const loadLatest = useMessages((s) => s.loadLatest);
  const loadOlder = useMessages((s) => s.loadOlder);
  const setActive = useActiveConversation((s) => s.setActive);
  const typingUsers = useTyping((s) => s.typing[conversation.id] ?? EMPTY_TYPING);

  // Frozen the moment the chat opens (lazy initializer, read only once): useMarkRead clears the
  // real unread_count almost immediately, but the divider should stay put while you're reading,
  // like Signal's does.
  const [frozenUnreadCount] = useState(() => conversation.unread_count);

  useEffect(() => {
    setActive(conversation.id);
    if (!useMessages.getState().get(conversation.id).loaded) {
      void loadLatest(conversation.id);
    }
    return () => setActive(null);
    // Runs once per mount (conversation.id is stable: page.tsx remounts this per chat via `key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useMarkRead(conversation.id);

  const unreadAnchorId = useMemo(
    () => computeUnreadAnchor(convState.items, frozenUnreadCount, myId),
    [convState.items, frozenUnreadCount, myId]
  );

  const someoneTyping = Object.entries(typingUsers).some(([userId, typing]) => typing && Number(userId) !== myId);

  return (
    <div style={{ display: "flex", height: "100%", flexDirection: "column", background: "var(--conversation-bg)" }}>
      <ConversationHeader conversation={conversation} />
      <Timeline
        items={convState.items}
        hasMore={convState.hasMore}
        loadingOlder={convState.loadingOlder}
        onLoadOlder={() => loadOlder(conversation.id)}
        myId={myId}
        unreadDividerBeforeId={unreadAnchorId}
        unreadCount={frozenUnreadCount}
        someoneTyping={someoneTyping}
      />
      <Composer conversationId={conversation.id} />
    </div>
  );
}
