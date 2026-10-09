// Chat-row dates, following Signal's rules (design-tokens §7.7).

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const SIX_MONTHS = 6 * 30 * DAY;

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** "Now", "5m", "3:45 PM", "Mon", "Jan 5" or "Jan 5, 2024". `now` is a parameter so tests can fix it. */
export function formatChatDate(timestamp: number, now: number = Date.now()): string {
  const diff = now - timestamp;
  const date = new Date(timestamp);
  const today = new Date(now);

  if (diff < MINUTE) return "Now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (sameDay(date, today)) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (diff < WEEK && sameMonth(date, today)) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  if (diff < SIX_MONTHS) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** The conversation header's subtitle (D-12/D-31's deliberate, deliberately subtle deviation:
 * Signal itself has no online/last-seen indicator). `null` means "say nothing" (never seen). */
export function formatPresence(online: boolean, lastSeenAt: number | null, now: number = Date.now()): string | null {
  if (online) return "Online";
  if (lastSeenAt == null) return null;
  return `Last seen ${formatChatDate(lastSeenAt, now)}`;
}

/**
 * Message-bubble timestamp (design-tokens §8.5): "Now" / "{n}m" / clock time. Unlike
 * formatChatDate this never falls back to a weekday or date — the day separator (below) carries
 * that, so the bubble never needs to.
 */
export function formatBubbleTime(timestamp: number, now: number = Date.now()): string {
  const diff = now - timestamp;
  if (diff < MINUTE) return "Now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  return new Date(timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/**
 * Day-separator label (design-tokens §8.2): "Today" / "Yesterday" / weekday / "Jan 5" /
 * "Jan 5, 2024" — the same date rule as the chat row (§7.7), but anchored to calendar days
 * rather than elapsed time, since the separator only ever appears once per day of messages.
 */
export function formatDaySeparator(timestamp: number, now: number = Date.now()): string {
  const date = new Date(timestamp);
  const today = new Date(now);
  const yesterday = new Date(now - DAY);

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  if (now - timestamp < WEEK && sameMonth(date, today)) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  if (now - timestamp < SIX_MONTHS) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
