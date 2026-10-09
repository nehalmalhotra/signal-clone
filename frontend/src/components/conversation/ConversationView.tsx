"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConversationHeader } from "./ConversationHeader";
import { Composer } from "./Composer";
import { RemovedBanner } from "./RemovedBanner";
import { Timeline } from "./Timeline";
import { useMarkRead } from "@/hooks/useMarkRead";
import { avatarColors } from "@/lib/avatarColors";
import { conversationsApi } from "@/lib/endpoints";
import { fullName } from "@/lib/names";
import { computeUnreadAnchor } from "@/lib/timeline";
import type { ConversationSummary, Member } from "@/lib/types";
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

  // Group chats need every member's name for sender labels and group_update lines ("Alice added
  // Bob"); 1:1 chats don't need this at all (the peer is already on `conversation`).
  const [members, setMembers] = useState<Member[]>([]);
  const isGroup = conversation.type === "group";

  useEffect(() => {
    setActive(conversation.id);
    if (!useMessages.getState().get(conversation.id).loaded) {
      void loadLatest(conversation.id);
    }
    return () => setActive(null);
    // Runs once per mount (conversation.id is stable: page.tsx remounts this per chat via `key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    if (!isGroup) return;
    void conversationsApi.getDetail(conversation.id).then((d) => setMembers(d.members));
    // Re-fetched whenever the member count changes (add/remove/leave bumps last_activity_at's
    // sibling field on the chat-list row via conversation.updated, which remounts this via `key`
    // only on chat switch — member_count is the cheap signal that membership actually changed).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, conversation.member_count]);

  const nameOf = useCallback(
    (userId: number) => {
      if (userId === myId) return "You";
      const m = members.find((mm) => mm.user.id === userId);
      return m ? fullName(m.user) : "Someone";
    },
    [members, myId]
  );

  // Each member's own avatar_color (already assigned per-user, same palette as their avatar) is
  // reused as their sender-name color in group bubbles, like Signal's per-member name colors.
  const colorOf = useCallback(
    (userId: number) => {
      const m = members.find((mm) => mm.user.id === userId);
      return avatarColors(m?.user.avatar_color ?? "A100").fg;
    },
    [members]
  );

  useMarkRead(conversation.id);

  const unreadAnchorId = useMemo(
    () => computeUnreadAnchor(convState.items, frozenUnreadCount, myId),
    [convState.items, frozenUnreadCount, myId]
  );

  const someoneTyping = Object.entries(typingUsers).some(([userId, typing]) => typing && Number(userId) !== myId);

  return (
    <div style={{ display: "flex", height: "100%", flexDirection: "column", background: "var(--conversation-bg)" }}>
      <ConversationHeader conversation={conversation} members={members} />
      <Timeline
        items={convState.items}
        hasMore={convState.hasMore}
        loadingOlder={convState.loadingOlder}
        onLoadOlder={() => loadOlder(conversation.id)}
        myId={myId}
        unreadDividerBeforeId={unreadAnchorId}
        unreadCount={frozenUnreadCount}
        someoneTyping={someoneTyping}
        isGroup={isGroup}
        nameOf={nameOf}
        colorOf={colorOf}
      />
      {conversation.is_member ? <Composer conversationId={conversation.id} /> : <RemovedBanner />}
    </div>
  );
}
