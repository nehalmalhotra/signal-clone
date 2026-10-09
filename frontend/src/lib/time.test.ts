import { describe, expect, it } from "vitest";
import { formatChatDate } from "./time";

// Built with local-time constructors so the tests pass in any timezone.
const now = new Date(2026, 9, 9, 15, 0).getTime(); // Fri Oct 9 2026, 3:00 PM

describe("formatChatDate", () => {
  it("says Now under a minute", () => {
    expect(formatChatDate(now - 30_000, now)).toBe("Now");
  });

  it("counts minutes under an hour", () => {
    expect(formatChatDate(now - 5 * 60_000, now)).toBe("5m");
  });

  it("shows the time earlier today", () => {
    expect(formatChatDate(new Date(2026, 9, 9, 9, 5).getTime(), now)).toBe("9:05 AM");
  });

  it("shows the weekday within the week and month", () => {
    expect(formatChatDate(new Date(2026, 9, 6, 12, 0).getTime(), now)).toBe("Tue");
  });

  it("shows month and day across a month boundary, even inside a week", () => {
    expect(formatChatDate(new Date(2026, 8, 30, 12, 0).getTime(), now)).toBe("Sep 30");
  });

  it("adds the year after six months", () => {
    expect(formatChatDate(new Date(2025, 11, 1, 12, 0).getTime(), now)).toBe("Dec 1, 2025");
  });
});
