"use client";

import styles from "./MessageBubble.module.css";
import { MessageStatusIcon } from "@/components/icons/MessageStatusIcon";
import { retrySend } from "@/lib/ws/realtime";
import { formatBubbleTime } from "@/lib/time";
import type { StoredMessage } from "@/store/messages";

interface Props {
  message: StoredMessage;
  mine: boolean;
  collapsedAbove: boolean;
  collapsedBelow: boolean;
  showMeta: boolean;
}

/** design-tokens §3/§8.1: 18px radius, 4px on the sender-side corner touching a grouped
 * neighbor; the outgoing gradient is fixed to the window, not the bubble. */
function bubbleRadius(mine: boolean, collapsedAbove: boolean, collapsedBelow: boolean): string {
  const full = 18;
  const tight = 4;
  const senderCorner = mine ? "end" : "start"; // outgoing groups on the right, incoming on the left
  const topSender = collapsedAbove ? tight : full;
  const bottomSender = collapsedBelow ? tight : full;
  const topOther = full;
  const bottomOther = full;
  return senderCorner === "end"
    ? `${topOther}px ${topSender}px ${bottomSender}px ${bottomOther}px` // top-left, top-right, bottom-right, bottom-left
    : `${topSender}px ${topOther}px ${bottomOther}px ${bottomSender}px`;
}

export function MessageBubble({ message, mine, collapsedAbove, collapsedBelow, showMeta }: Props) {
  const failed = message.status === "error";
  const marginTop = collapsedAbove ? 1 : 6;
  const marginBottom = collapsedBelow ? 1 : 6;

  return (
    <div className={`${styles.row} ${mine ? styles.mine : styles.theirs}`} style={{ marginTop, marginBottom }}>
      <div className={styles.bubbleWrap} style={{ flexDirection: mine ? "row-reverse" : "row" }}>
        {failed && (
          <button
            type="button"
            className={styles.errorButton}
            onClick={() => retrySend(message.client_id)}
            aria-label="Send failed. Retry"
            title="Send failed. Retry"
          >
            <MessageStatusIcon status="error" />
          </button>
        )}
        <div
          className={`${styles.bubble} ${mine ? styles.bubbleOutgoing : styles.bubbleIncoming}`}
          style={{ borderRadius: bubbleRadius(mine, collapsedAbove, collapsedBelow) }}
        >
          <div className={styles.body}>{message.body}</div>
          {showMeta && (
            <div className={`${styles.meta} ${mine ? styles.metaOutgoing : styles.metaIncoming}`}>
              <span className={styles.time}>{formatBubbleTime(message.sent_at)}</span>
              {/* "error" has its own 20x20 icon outside the bubble (§8.7); no second icon here. */}
              {mine && message.status && message.status !== "error" && (
                <MessageStatusIcon status={message.status} oncolor />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
