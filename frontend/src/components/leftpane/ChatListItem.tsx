"use client";

import { useRouter } from "next/navigation";
import styles from "./ChatListItem.module.css";
import { Avatar } from "@/components/ui/Avatar";
import { MessageStatusIcon } from "@/components/icons/MessageStatusIcon";
import { formatChatDate } from "@/lib/time";
import type { ConversationSummary } from "@/lib/types";
import { useSession } from "@/store/session";

interface Props {
  conversation: ConversationSummary;
  selected: boolean;
}

/** One row of the chat list (design-tokens §4). */
export function ChatListItem({ conversation, selected }: Props) {
  const router = useRouter();
  const myId = useSession((s) => s.me?.id);
  const { last_message } = conversation;
  const mine = last_message?.sender_id === myId;

  const preview = last_message
    ? last_message.kind === "group_update"
      ? groupUpdateText(last_message.meta)
      : last_message.body
    : "";

  return (
    <button
      type="button"
      className={`${styles.row} ${selected ? styles.selected : ""} focus-ring`}
      onClick={() => router.push(`/c/${conversation.id}`)}
    >
      <span className={styles.avatar}>
        <Avatar name={conversation.title} color={conversation.avatar_color} url={conversation.avatar_url} size={48} />
      </span>
      <span className={styles.content}>
        <span className={styles.headerLine}>
          <span className={styles.name}>{conversation.title}</span>
          <span className={styles.date}>{formatChatDate(conversation.last_activity_at)}</span>
        </span>
        <span className={styles.previewLine}>
          <span className={styles.preview}>{preview}</span>
          {mine && last_message?.status && (
            <span className={styles.statusIcon}>
              <MessageStatusIcon status={last_message.status} />
            </span>
          )}
          {conversation.unread_count > 0 && (
            <span className={styles.badge}>{conversation.unread_count > 99 ? "99+" : conversation.unread_count}</span>
          )}
        </span>
      </span>
    </button>
  );
}

// Group-update bodies carry no text (backend/app/models/messages.py meta); render a short caption.
function groupUpdateText(meta: Record<string, unknown> | null): string {
  const action = meta?.action;
  switch (action) {
    case "group_created":
      return "Group created";
    case "member_added":
      return "Added a member";
    case "member_removed":
      return "Removed a member";
    case "member_left":
      return "A member left";
    default:
      return "Group updated";
  }
}
