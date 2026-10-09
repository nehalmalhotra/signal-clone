import type { MessageStatus } from "@/lib/types";
import styles from "./MessageStatusIcon.module.css";

type Status = MessageStatus | "sending" | "error";

/**
 * Redrawn from scratch (design-tokens §5), not copied from Signal's SVGs:
 * sending = dashed ring (rotates), sent = one outlined circle + check, delivered = two
 * outlined circles + checks, read = two FILLED circles with knocked-out checks (never blue -
 * CLAUDE.md "Known Signal details"), error = filled circle with "!".
 */
export function MessageStatusIcon({ status, oncolor }: { status: Status; oncolor?: boolean }) {
  const cls = `${styles.icon} ${oncolor ? styles.oncolor : ""}`;

  if (status === "sending") {
    return (
      <svg className={`${cls} ${styles.spin}`} viewBox="0 0 12 12" width="12" height="12" aria-label="Sending">
        <circle
          cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.2"
          strokeDasharray="1.4 1.6" strokeLinecap="round"
        />
      </svg>
    );
  }

  if (status === "error") {
    return (
      <svg className={cls} viewBox="0 0 12 12" width="12" height="12" aria-label="Send failed">
        <circle cx="6" cy="6" r="6" fill="var(--error)" />
        <rect x="5.3" y="2.6" width="1.4" height="4.2" rx="0.7" fill="#fff" />
        <circle cx="6" cy="8.6" r="0.9" fill="#fff" />
      </svg>
    );
  }

  if (status === "sent") {
    return (
      <svg className={cls} viewBox="0 0 12 12" width="12" height="12" aria-label="Sent">
        <circle cx="6" cy="6" r="5.4" fill="none" stroke="currentColor" strokeWidth="1.1" />
        <path
          d="M3.6 6.2L5.1 7.7L8.4 4.3" fill="none" stroke="currentColor" strokeWidth="1.1"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    );
  }

  // delivered / read: two overlapping circles, 18x12 (§5)
  const filled = status === "read";
  return (
    <svg className={cls} viewBox="0 0 18 12" width="18" height="12" aria-label={filled ? "Read" : "Delivered"}>
      <g transform="translate(0,0)">
        <circle cx="6" cy="6" r="5.4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.1" />
        <path
          d="M3.6 6.2L5.1 7.7L8.4 4.3" fill="none"
          stroke={filled ? "var(--surface-primary)" : "currentColor"} strokeWidth="1.1"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </g>
      <g transform="translate(6.5,0)">
        <circle cx="6" cy="6" r="5.4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.1" />
        <path
          d="M3.6 6.2L5.1 7.7L8.4 4.3" fill="none"
          stroke={filled ? "var(--surface-primary)" : "currentColor"} strokeWidth="1.1"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
