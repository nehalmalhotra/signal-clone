// Exercises the send/ack/timeout/retry orchestration in realtime.ts against a fake
// RealtimeSocket, so the 15s ack timeout and "same client_id on retry" rules (protocol doc)
// are covered without a real network.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Me } from "@/lib/types";
import { useMessages } from "@/store/messages";
import { useOutbox } from "@/store/outbox";
import { useSession } from "@/store/session";
import { retrySend, sendChatMessage, startRealtime, stopRealtime } from "./realtime";

const me: Me = {
  id: 1,
  given_name: "Alice",
  family_name: null,
  username: null,
  about: null,
  avatar_url: null,
  avatar_color: "A110",
  last_seen_at: null,
  phone_number: "+15555550001",
  created_at: Date.now(),
};

const { FakeRealtimeSocket } = vi.hoisted(() => {
  class FakeRealtimeSocket {
    static instances: FakeRealtimeSocket[] = [];
    sent: unknown[] = [];
    opts: Record<string, unknown>;
    constructor(opts: Record<string, unknown>) {
      this.opts = opts;
      FakeRealtimeSocket.instances.push(this);
    }
    start() {}
    stop() {}
    send(event: unknown) {
      this.sent.push(event);
      return true;
    }
    get isOpen() {
      return true;
    }
  }
  return { FakeRealtimeSocket };
});

vi.mock("./socket", () => ({ RealtimeSocket: FakeRealtimeSocket }));

function lastFakeSocket(): InstanceType<typeof FakeRealtimeSocket> {
  return FakeRealtimeSocket.instances[FakeRealtimeSocket.instances.length - 1];
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeRealtimeSocket.instances = [];
  useMessages.setState({ byConversation: {} });
  useOutbox.setState({ pending: {} });
  useSession.setState({ me });
});

afterEach(() => {
  stopRealtime();
  vi.useRealTimers();
});

describe("realtime send/ack/retry", () => {
  it("sends message.send immediately and marks the bubble failed after the 15s ack timeout", () => {
    startRealtime();
    sendChatMessage(10, "hi");

    const socket = lastFakeSocket();
    expect(socket.sent).toHaveLength(1);
    expect(socket.sent[0]).toMatchObject({ type: "message.send", conversation_id: 10, body: "hi" });

    const clientId = (socket.sent[0] as { client_id: string }).client_id;
    expect(useMessages.getState().get(10).items[0].status).toBe("sending");

    vi.advanceTimersByTime(15_000);
    expect(useMessages.getState().get(10).items[0].status).toBe("error");
    expect(useOutbox.getState().pending[clientId]).toBeDefined(); // kept for retry
  });

  it("retry resends with the same client_id and moves the bubble back to sending", () => {
    startRealtime();
    sendChatMessage(10, "hi");
    const socket = lastFakeSocket();
    const clientId = (socket.sent[0] as { client_id: string }).client_id;
    vi.advanceTimersByTime(15_000); // times out -> failed

    retrySend(clientId);
    expect(useMessages.getState().get(10).items[0].status).toBe("sending");
    expect(socket.sent).toHaveLength(2);
    expect(socket.sent[1]).toMatchObject({ type: "message.send", client_id: clientId, body: "hi" });
  });

  it("clears the outbox entry once message.ack arrives, so no timeout fires afterward", () => {
    startRealtime();
    sendChatMessage(10, "hi");
    const socket = lastFakeSocket();
    const clientId = (socket.sent[0] as { client_id: string }).client_id;

    const onEvent = socket.opts.onEvent as (e: unknown) => void;
    onEvent({
      type: "message.ack",
      client_id: clientId,
      message: {
        id: 99,
        conversation_id: 10,
        sender_id: 1,
        client_id: clientId,
        kind: "text",
        body: "hi",
        meta: null,
        sent_at: Date.now(),
        status: "sent",
      },
    });

    expect(useOutbox.getState().pending[clientId]).toBeUndefined();
    expect(useMessages.getState().get(10).items[0]).toMatchObject({ id: 99, status: "sent" });

    vi.advanceTimersByTime(15_000);
    expect(useMessages.getState().get(10).items[0].status).toBe("sent"); // the timeout never fires late
  });
});
