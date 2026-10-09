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
