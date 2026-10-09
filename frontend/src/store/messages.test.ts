import { describe, expect, it, beforeEach } from "vitest";
import { useMessages } from "./messages";
import type { Message } from "@/lib/types";

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: 1,
    conversation_id: 10,
    sender_id: 2,
    client_id: "c1",
    kind: "text",
    body: "hi",
    meta: null,
    sent_at: Date.now(),
    status: null,
    ...overrides,
  };
}

beforeEach(() => {
  useMessages.setState({ byConversation: {} });
});

describe("useMessages", () => {
  it("adds an optimistic message with a negative id and status sending", () => {
    const optimistic = useMessages.getState().addOptimistic(10, "c1", "hi", 2);
    expect(optimistic.id).toBeLessThan(0);
    expect(optimistic.status).toBe("sending");
    expect(useMessages.getState().get(10).items).toHaveLength(1);
  });

  it("applyAck swaps the optimistic bubble for the server message", () => {
    useMessages.getState().addOptimistic(10, "c1", "hi", 2);
    useMessages.getState().applyAck("c1", message({ id: 99, status: "sent" }));
    const items = useMessages.getState().get(10).items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(99);
    expect(items[0].status).toBe("sent");
  });

  it("applyNew dedupes by message id", () => {
    useMessages.setState({ byConversation: { 10: { items: [], hasMore: false, loadingOlder: false, loaded: true } } });
    useMessages.getState().applyNew(message({ id: 5 }));
    useMessages.getState().applyNew(message({ id: 5 }));
    expect(useMessages.getState().get(10).items).toHaveLength(1);
  });

  it("applyReceipt never moves status backward", () => {
    useMessages.setState({
      byConversation: {
        10: { items: [{ ...message({ id: 5, status: "read" }) }], hasMore: false, loadingOlder: false, loaded: true },
      },
    });
    useMessages.getState().applyReceipt(10, [5], "delivered");
    expect(useMessages.getState().get(10).items[0].status).toBe("read");

    useMessages.getState().applyReceipt(10, [5], "read");
    expect(useMessages.getState().get(10).items[0].status).toBe("read");
  });

  it("markFailed only touches the optimistic entry across conversations", () => {
    useMessages.getState().addOptimistic(10, "c1", "hi", 2);
    useMessages.getState().markFailed("c1");
    expect(useMessages.getState().get(10).items[0].status).toBe("error");
  });
});
