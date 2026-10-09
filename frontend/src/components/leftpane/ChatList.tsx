"use client";

import { useParams } from "next/navigation";
import styles from "./ChatList.module.css";
import { ChatListItem } from "./ChatListItem";
import { useChats } from "@/store/chats";

/** The default view of the left pane: every chat, most recent first (design-tokens §4). */
export function ChatList({ unreadOnly }: { unreadOnly: boolean }) {
  const conversations = useChats((s) => s.conversations);
  const params = useParams<{ id?: string }>();
  const activeId = params?.id ? Number(params.id) : null;

  const visible = unreadOnly ? conversations.filter((c) => c.unread_count > 0) : conversations;

  if (conversations.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No chats</p>
        <p className={styles.emptySubtitle}>Recent chats will appear here.</p>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptySubtitle}>No unread chats.</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {visible.map((c) => (
        <ChatListItem key={c.id} conversation={c} selected={c.id === activeId} />
      ))}
    </div>
  );
}
