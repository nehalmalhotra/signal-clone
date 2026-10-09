// The low-level WebSocket client. No React here on purpose, so it can be driven by a fake
// WebSocket in unit tests (socket.test.ts) without a browser or a DOM.
import type { ClientEvent, ServerEvent } from "./events";
import { parseServerEvent } from "./events";

const PING_INTERVAL_MS = 25_000; // protocol doc: "Send ping every 25s"
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const CLOSE_UNAUTHORIZED = 4401; // bad/expired token: don't retry (docs/websocket-protocol.md)

export type ConnectionState = "connecting" | "open" | "closed";

interface RealtimeSocketOptions {
  /** Returns the full ws(s):// URL to connect to, built fresh each attempt (the token may have changed). */
  url: () => string;
  getToken: () => string | null;
  onEvent: (event: ServerEvent) => void;
  /** Called once per connect, right after the server's `ready` frame. */
  onReady: () => void;
  onStateChange?: (state: ConnectionState) => void;
  /** Close code 4401: the token is bad. The caller should clear it and send the user to login. */
  onAuthFailed: () => void;
  /** Override for tests; defaults to the global WebSocket constructor. */
  WebSocketImpl?: typeof WebSocket;
}

/**
 * One persistent connection to /ws, reconnecting with backoff on any drop except 4401
 * (bad token — docs/websocket-protocol.md's close-code table). Callers queue their own sends;
 * this class only knows about one socket at a time.
 */
export class RealtimeSocket {
  private ws: WebSocket | null = null;
  private state: ConnectionState = "closed";
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;

  constructor(private opts: RealtimeSocketOptions) {}

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    this.ws?.close();
    this.ws = null;
    this.setState("closed");
  }

  get isOpen(): boolean {
    return this.state === "open";
  }

  /** Returns false if the socket isn't ready yet; the caller keeps the event queued (the outbox). */
  send(event: ClientEvent): boolean {
    if (!this.ws || this.state !== "open") return false;
    this.ws.send(JSON.stringify(event));
    return true;
  }

  private connect(): void {
    if (this.stopped) return;
    const token = this.opts.getToken();
    if (!token) return; // no session: nothing to connect with

    this.setState("connecting");
    const WS = this.opts.WebSocketImpl ?? WebSocket;
    const ws = new WS(this.opts.url());
    this.ws = ws;
    // `ready` only arrives after this frame is accepted, so the socket isn't "open" to callers
    // until then (docs/websocket-protocol.md: "Until then nothing else is accepted").
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", token } satisfies ClientEvent));
    };

    ws.onmessage = (ev) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      const event = parseServerEvent(parsed);
      if (!event) return;

      if (event.type === "ready") {
        this.reconnectAttempt = 0; // backoff resets only once the handshake actually succeeds
        this.setState("open");
        this.startPing();
        this.opts.onReady();
      }
      this.opts.onEvent(event);
    };

    ws.onclose = (ev) => {
      this.clearPing();
      this.ws = null;
      if (ev.code === CLOSE_UNAUTHORIZED) {
        this.setState("closed");
        this.opts.onAuthFailed();
        return; // no retry: the token itself is the problem
      }
      this.setState("closed");
      this.scheduleReconnect();
    };

    // onclose already fires after a connection-level error in browsers; nothing extra to do here
    // beyond keeping TypeScript quiet about an unused handler, so this is intentionally omitted.
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return;
    const exp = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** this.reconnectAttempt);
    const jitter = exp * (0.5 + Math.random() * 0.5); // 50%-100% of the exponential delay
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, jitter);
  }

  private startPing(): void {
    this.clearPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: "ping" });
    }, PING_INTERVAL_MS);
  }

  private clearPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private clearTimers(): void {
    this.clearPing();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.opts.onStateChange?.(state);
  }
}
