// Turns a flat, oldest-first list of messages into the items the Timeline component renders:
// day separators, the unread divider, and per-message grouping flags. Pure and framework-free
// so it's unit-tested directly (timeline.test.ts) without mounting any component.
import type { MessageStatus } from "./types";

// Same author, same day, within 3 minutes, not split by the unread divider (design-tokens §8.1).
const COLLAPSE_WITHIN_MS = 3 * 60_000;

export interface TimelineMessageLike {
  id: number;
  sender_id: number;
  sent_at: number;
  status: MessageStatus | "sending" | "error" | null;
}

export type TimelineRenderItem<M> =
  | { kind: "day"; key: string; timestamp: number }
  | { kind: "unread"; key: string; count: number }
  | {
      kind: "message";
      key: string;
      message: M;
      /** True when this bubble's top corner (sender side) should shrink to 4px (design-tokens §3). */
      collapsedAbove: boolean;
      /** True when this bubble's bottom corner should shrink to 4px, and its own metadata may hide. */
      collapsedBelow: boolean;
      /** False only when collapsedBelow hides this bubble's time + status (design-tokens §8.1). */
      showMeta: boolean;
    };

function sameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
  );
}

/** Signal's grouping rule (design-tokens §8.1, from timelineUtil.std.ts `areMessagesInSameGroup`). */
function inSameGroup<M extends TimelineMessageLike>(
  older: M | undefined,
  newer: M | undefined,
  dividerBetween: boolean
): boolean {
  if (!older || !newer || dividerBetween) return false;
  return (
    older.sender_id === newer.sender_id &&
    newer.sent_at >= older.sent_at &&
    newer.sent_at - older.sent_at < COLLAPSE_WITHIN_MS &&
    sameDay(older.sent_at, newer.sent_at)
  );
}

/** design-tokens §8.1: an in-flight or failed message always keeps its own metadata, even mid-group. */
function hidesMetadata(collapsedBelow: boolean, status: TimelineMessageLike["status"]): boolean {
  if (!collapsedBelow) return false;
  return status !== "sending" && status !== "error";
}

export function buildTimeline<M extends TimelineMessageLike>(
  messages: readonly M[],
  opts: { unreadDividerBeforeId?: number | null; unreadCount?: number } = {}
): TimelineRenderItem<M>[] {
  const items: TimelineRenderItem<M>[] = [];
  const dividerIndex =
    opts.unreadDividerBeforeId != null ? messages.findIndex((m) => m.id === opts.unreadDividerBeforeId) : -1;

  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    if (!prev || !sameDay(prev.sent_at, msg.sent_at)) {
      items.push({ kind: "day", key: `day-${msg.id}`, timestamp: msg.sent_at });
    }
    if (i === dividerIndex) {
      items.push({ kind: "unread", key: "unread-divider", count: opts.unreadCount ?? 0 });
    }

    const next = messages[i + 1];
    const collapsedAbove = inSameGroup(prev, msg, i === dividerIndex);
    const collapsedBelow = inSameGroup(msg, next, i + 1 === dividerIndex);

    items.push({
      kind: "message",
      key: `msg-${msg.id}`,
      message: msg,
      collapsedAbove,
      collapsedBelow,
      showMeta: !hidesMetadata(collapsedBelow, msg.status),
    });
  });

  return items;
}
