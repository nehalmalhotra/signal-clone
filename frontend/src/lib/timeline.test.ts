import { describe, expect, it } from "vitest";
import { buildTimeline, type TimelineMessageLike } from "./timeline";

const DAY = 24 * 60 * 60 * 1000;
const base = new Date(2026, 9, 9, 10, 0).getTime(); // Fri Oct 9 2026, 10:00 AM local

function msg(id: number, senderId: number, sentAt: number, status: TimelineMessageLike["status"] = "sent"): TimelineMessageLike {
  return { id, sender_id: senderId, sent_at: sentAt, status };
}

describe("buildTimeline", () => {
  it("puts a day separator before the first message", () => {
    const items = buildTimeline([msg(1, 1, base)]);
    expect(items[0]).toMatchObject({ kind: "day" });
    expect(items[1]).toMatchObject({ kind: "message" });
  });

  it("collapses consecutive messages from the same sender within 3 minutes", () => {
    const items = buildTimeline([msg(1, 1, base), msg(2, 1, base + 60_000)]);
    const [, first, second] = items;
    expect(first).toMatchObject({ kind: "message", collapsedAbove: false, collapsedBelow: true });
    expect(second).toMatchObject({ kind: "message", collapsedAbove: true, collapsedBelow: false });
  });

  it("does not collapse across the 3 minute window", () => {
    const items = buildTimeline([msg(1, 1, base), msg(2, 1, base + 3 * 60_000 + 1)]);
    const messageItems = items.filter((i) => i.kind === "message");
    expect(messageItems[0]).toMatchObject({ collapsedBelow: false });
    expect(messageItems[1]).toMatchObject({ collapsedAbove: false });
  });

  it("does not collapse across different senders", () => {
    const items = buildTimeline([msg(1, 1, base), msg(2, 2, base + 1000)]);
    const messageItems = items.filter((i) => i.kind === "message");
    expect(messageItems[0]).toMatchObject({ collapsedBelow: false });
    expect(messageItems[1]).toMatchObject({ collapsedAbove: false });
  });

  it("inserts a day separator across a day boundary and breaks the group", () => {
    const items = buildTimeline([msg(1, 1, base), msg(2, 1, base + DAY)]);
    const kinds = items.map((i) => i.kind);
    expect(kinds).toEqual(["day", "message", "day", "message"]);
  });

  it("hides metadata on a grouped-below message unless it's sending or failed", () => {
    const sent = buildTimeline([msg(1, 1, base, "sent"), msg(2, 1, base + 1000, "sent")]);
    const messageItems = sent.filter((i) => i.kind === "message");
    expect(messageItems[0]).toMatchObject({ showMeta: false });

    const sending = buildTimeline([msg(1, 1, base, "sending"), msg(2, 1, base + 1000, "sending")]);
    const sendingItems = sending.filter((i) => i.kind === "message");
    expect(sendingItems[0]).toMatchObject({ showMeta: true });
  });

  it("places the unread divider before the given message and never collapses across it", () => {
    const items = buildTimeline([msg(1, 1, base), msg(2, 1, base + 1000), msg(3, 1, base + 2000)], {
      unreadDividerBeforeId: 2,
      unreadCount: 2,
    });
    expect(items.map((i) => i.kind)).toEqual(["day", "message", "unread", "message", "message"]);
    const messageItems = items.filter((i) => i.kind === "message");
    expect(messageItems[0]).toMatchObject({ collapsedBelow: false }); // split by the divider
    expect(messageItems[1]).toMatchObject({ collapsedAbove: false });
  });
});
