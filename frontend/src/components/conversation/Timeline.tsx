"use client";

import { useEffect, useRef } from "react";
import styles from "./Timeline.module.css";
import { DaySeparator } from "./DaySeparator";
import { GroupUpdateLine } from "./GroupUpdateLine";
import { MessageBubble } from "./MessageBubble";
import { TypingBubble } from "./TypingBubble";
import { UnreadDivider } from "./UnreadDivider";
import { useScrollAnchor } from "@/hooks/useScrollAnchor";
import { buildTimeline } from "@/lib/timeline";
import type { StoredMessage } from "@/store/messages";

interface Props {
  items: StoredMessage[];
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  myId: number | undefined;
  unreadDividerBeforeId: number | null;
  unreadCount: number;
  someoneTyping: boolean;
  /** Group chats only: id -> display name, for sender-name bubbles and group_update lines. */
  isGroup?: boolean;
  nameOf?: (userId: number) => string;
  /** Group chats only: each member's own avatar_color, reused as their sender-name color. */
  colorOf?: (userId: number) => string;
}

/** The scrollable message list: day separators, the unread divider, grouped bubbles, and the
 * typing indicator. Loads older messages when the top sentinel scrolls into view, without
 * jumping the view (useScrollAnchor). */
export function Timeline({
  items, hasMore, loadingOlder, onLoadOlder, myId, unreadDividerBeforeId, unreadCount, someoneTyping,
  isGroup, nameOf, colorOf,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { beforeLoadOlder, onScroll } = useScrollAnchor(containerRef, items.length + (someoneTyping ? 1 : 0));

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingOlder) {
          beforeLoadOlder();
          onLoadOlder();
        }
      },
      { root: containerRef.current }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingOlder, items.length]);

  const renderItems = buildTimeline(items, { unreadDividerBeforeId, unreadCount });

  return (
    <div ref={containerRef} className={styles.scroll} onScroll={onScroll} data-testid="timeline">
      <div ref={sentinelRef} className={styles.sentinel} />
      {loadingOlder && <div className={styles.loadingOlder}>Loading…</div>}
      {renderItems.map((item) => {
        if (item.kind === "day") return <DaySeparator key={item.key} timestamp={item.timestamp} />;
        if (item.kind === "unread") return <UnreadDivider key={item.key} count={item.count} />;
        if (item.message.kind === "group_update") {
          const meta = item.message.meta as { action?: string; target_ids?: number[] } | null;
          return (
            <GroupUpdateLine
              key={item.key}
              action={meta?.action ?? ""}
              targetIds={meta?.target_ids ?? []}
              senderId={item.message.sender_id}
              myId={myId}
              nameOf={nameOf ?? ((id) => `#${id}`)}
            />
          );
        }
        const mine = item.message.sender_id === myId;
        return (
          <MessageBubble
            key={item.key}
            message={item.message}
            mine={mine}
            collapsedAbove={item.collapsedAbove}
            collapsedBelow={item.collapsedBelow}
            showMeta={item.showMeta}
            senderName={isGroup && !mine && nameOf ? nameOf(item.message.sender_id) : undefined}
            senderColor={isGroup && !mine && colorOf ? colorOf(item.message.sender_id) : undefined}
          />
        );
      })}
      {someoneTyping && <TypingBubble />}
    </div>
  );
}
