"use client";

import { useEffect, useRef } from "react";
import styles from "./Timeline.module.css";
import { DaySeparator } from "./DaySeparator";
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
}

/** The scrollable message list: day separators, the unread divider, grouped bubbles, and the
 * typing indicator. Loads older messages when the top sentinel scrolls into view, without
 * jumping the view (useScrollAnchor). */
export function Timeline({
  items, hasMore, loadingOlder, onLoadOlder, myId, unreadDividerBeforeId, unreadCount, someoneTyping,
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
    <div ref={containerRef} className={styles.scroll} onScroll={onScroll}>
      <div ref={sentinelRef} className={styles.sentinel} />
      {loadingOlder && <div className={styles.loadingOlder}>Loading…</div>}
      {renderItems.map((item) => {
        if (item.kind === "day") return <DaySeparator key={item.key} timestamp={item.timestamp} />;
        if (item.kind === "unread") return <UnreadDivider key={item.key} count={item.count} />;
        return (
          <MessageBubble
            key={item.key}
            message={item.message}
            mine={item.message.sender_id === myId}
            collapsedAbove={item.collapsedAbove}
            collapsedBelow={item.collapsedBelow}
            showMeta={item.showMeta}
          />
        );
      })}
      {someoneTyping && <TypingBubble />}
    </div>
  );
}
