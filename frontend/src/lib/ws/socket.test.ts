import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeSocket } from "./socket";

/** A minimal fake WebSocket: lets the test drive open/message/close by hand, with no real network. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: ((ev: { code: number }) => void) | null = null;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
  }

  // --- test helpers, not part of the real WebSocket API ---
  triggerOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  triggerMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  triggerClose(code: number) {
    this.onclose?.({ code });
  }
}

function lastSocket(): FakeWebSocket {
  return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function makeClient(overrides: Partial<ConstructorParameters<typeof RealtimeSocket>[0]> = {}) {
  const events: unknown[] = [];
  const states: string[] = [];
  const authFailed = vi.fn();
  const client = new RealtimeSocket({
    url: () => "ws://test/ws",
    getToken: () => "tok",
    onEvent: (e) => events.push(e),
    onReady: () => {},
    onStateChange: (s) => states.push(s),
    onAuthFailed: authFailed,
    WebSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
    ...overrides,
  });
  return { client, events, states, authFailed };
}

describe("RealtimeSocket", () => {
  it("sends auth as the first frame once the connection opens", () => {
    const { client } = makeClient();
    client.start();
    lastSocket().triggerOpen();
    expect(JSON.parse(lastSocket().sent[0])).toEqual({ type: "auth", token: "tok" });
  });

  it("is not open until `ready` arrives, even after the socket opens", () => {
    const { client } = makeClient();
    client.start();
    lastSocket().triggerOpen();
    expect(client.isOpen).toBe(false);
    lastSocket().triggerMessage({ type: "ready", user_id: 1, online_user_ids: [] });
    expect(client.isOpen).toBe(true);
  });

  it("queues nothing itself: send() returns false while not ready", () => {
    const { client } = makeClient();
    client.start();
    lastSocket().triggerOpen();
    expect(client.send({ type: "ping" })).toBe(false);
  });

  it("reconnects with backoff on an ordinary drop", () => {
    const { client } = makeClient();
    client.start();
    lastSocket().triggerOpen();
    lastSocket().triggerMessage({ type: "ready", user_id: 1, online_user_ids: [] });
    expect(FakeWebSocket.instances).toHaveLength(1);

    lastSocket().triggerClose(1006);
    expect(FakeWebSocket.instances).toHaveLength(1); // not yet, waiting out the backoff
    vi.advanceTimersByTime(5_000);
    expect(FakeWebSocket.instances.length).toBeGreaterThan(1);
  });

  it("does not reconnect on 4401 and calls onAuthFailed instead", () => {
    const { client, authFailed } = makeClient();
    client.start();
    lastSocket().triggerOpen();
    lastSocket().triggerClose(4401);
    vi.advanceTimersByTime(60_000);
    expect(authFailed).toHaveBeenCalledOnce();
    expect(FakeWebSocket.instances).toHaveLength(1); // no reconnect attempt
  });

  it("resets the backoff after a successful ready", () => {
    const { client } = makeClient();
    client.start();
    lastSocket().triggerOpen();
    lastSocket().triggerClose(1006); // fail before ever reaching ready
    vi.advanceTimersByTime(2_000);
    lastSocket().triggerClose(1006); // fail again, backoff should have grown
    const beforeReset = FakeWebSocket.instances.length;
    vi.advanceTimersByTime(10_000);
    expect(FakeWebSocket.instances.length).toBeGreaterThan(beforeReset);

    lastSocket().triggerOpen();
    lastSocket().triggerMessage({ type: "ready", user_id: 1, online_user_ids: [] });
    lastSocket().triggerClose(1006);
    const countAfterReadyDrop = FakeWebSocket.instances.length;
    vi.advanceTimersByTime(1_500); // first backoff after a reset ready should be short again
    expect(FakeWebSocket.instances.length).toBeGreaterThan(countAfterReadyDrop);
  });
});
