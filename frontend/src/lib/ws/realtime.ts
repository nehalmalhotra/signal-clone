// The router: the one place that owns the socket and translates its events into store writes.
// Components and hooks never import socket.ts directly — they call the functions here
// (sendChatMessage, retrySend, sendTyping, sendRead) and read the stores for state.
import { API_URL } from "@/lib/api";
import { clearToken, readToken } from "@/lib/session";
import { useActiveConversation } from "@/store/activeConversation";
import { useChats } from "@/store/chats";
import { useMessages } from "@/store/messages";
import { useOutbox } from "@/store/outbox";
import { usePresence } from "@/store/presence";
import { useSession } from "@/store/session";
import { useTyping } from "@/store/typing";
import type { ServerEvent } from "./events";
import { RealtimeSocket } from "./socket";

// protocol doc: "no ack after a timeout, then retry" — 15s balances a slow network against not
// leaving a bubble stuck on "sending" for too long.
const ACK_TIMEOUT_MS = 15_000;

function wsUrl(): string {
  return `${API_URL.replace(/^http/, "ws")}/ws`;
}

let socket: RealtimeSocket | null = null;

export function startRealtime(): void {
  if (socket) return; // already running (e.g. StrictMode double-invoke, or a second call)
  socket = new RealtimeSocket({
    url: wsUrl,
    getToken: readToken,
    onReady: handleReady,
    onEvent: handleEvent,
    onAuthFailed: () => {
      clearToken();
      // Full reload, same as lib/api.ts's 401 handling: wipes every in-memory store so nothing
      // from the old session leaks into the next one.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload on purpose (preserving-ui-state.md "State and authentication")
      window.location.href = "/register";
    },
  });
  socket.start();
}

export function stopRealtime(): void {
  socket?.stop();
  socket = null;
}

// --- outgoing -----------------------------------------------------------------------

function attemptSend(clientId: string): void {
  const entry = useOutbox.getState().pending[clientId];
  if (!entry || !socket) return;
  socket.send({ type: "message.send", conversation_id: entry.conversationId, client_id: clientId, body: entry.body });
  const timer = setTimeout(() => {
    // Still pending after the timeout: mark it failed, but keep the outbox entry so Retry can
    // resend with the same client_id (protocol doc: "resend the same one after a failure").
    if (useOutbox.getState().pending[clientId]) {
      useMessages.getState().markFailed(clientId);
      useOutbox.getState().setTimer(clientId, null);
    }
  }, ACK_TIMEOUT_MS);
  useOutbox.getState().setTimer(clientId, timer);
}

export function sendChatMessage(conversationId: number, body: string): void {
  const me = useSession.getState().me;
  if (!me) return;
  const clientId = crypto.randomUUID();
  useMessages.getState().addOptimistic(conversationId, clientId, body, me.id);
  useOutbox.getState().add({ conversationId, clientId, body, timer: null });
  attemptSend(clientId);
}

export function retrySend(clientId: string): void {
  if (!useOutbox.getState().pending[clientId]) return;
  useMessages.getState().markSending(clientId);
  attemptSend(clientId);
}

export function sendTyping(conversationId: number, typing: boolean): void {
  socket?.send({ type: "typing", conversation_id: conversationId, typing });
}

export function sendRead(conversationId: number, upToMessageId: number): void {
  socket?.send({ type: "message.read", conversation_id: conversationId, up_to_message_id: upToMessageId });
}

function flushOutbox(): void {
  Object.keys(useOutbox.getState().pending).forEach(attemptSend);
}

// --- incoming -----------------------------------------------------------------------

/** Runs after every (re)connect's `ready`: the protocol doc says anything missed while
 * disconnected is picked up over REST, not replayed on the socket. */
function handleReady(): void {
  void useChats.getState().load();
  const openId = useActiveConversation.getState().id;
  if (openId != null) void useMessages.getState().loadLatest(openId);
  flushOutbox();
}

function isOpenAndVisible(conversationId: number): boolean {
  return (
    useActiveConversation.getState().id === conversationId &&
    typeof document !== "undefined" &&
    document.visibilityState === "visible"
  );
}

function handleEvent(event: ServerEvent): void {
  switch (event.type) {
    case "ready":
      usePresence.getState().setOnlineSnapshot(event.online_user_ids);
      return;

    case "message.ack":
      useOutbox.getState().remove(event.client_id);
      useMessages.getState().applyAck(event.client_id, event.message);
      useChats.getState().applyMessage(event.message, { mine: true, isOpenAndVisible: false });
      return;

    case "message.new": {
      const me = useSession.getState().me;
      const mine = me != null && event.message.sender_id === me.id;
      useMessages.getState().applyNew(event.message);
      if (!useChats.getState().has(event.message.conversation_id)) {
        // A conversation we don't know about yet (e.g. someone just messaged you for the first
        // time): the REST list has it, so refresh wholesale rather than guessing its shape.
        void useChats.getState().load();
      } else {
        useChats.getState().applyMessage(event.message, { mine, isOpenAndVisible: isOpenAndVisible(event.message.conversation_id) });
      }
      return;
    }

    case "receipt.update":
      useMessages.getState().applyReceipt(event.conversation_id, event.message_ids, event.status);
      useChats.getState().applyReceipt(event.conversation_id, event.message_ids, event.status);
      return;

    case "read.sync":
      useChats.getState().clearUnread(event.conversation_id);
      return;

    case "typing":
      useTyping.getState().setTyping(event.conversation_id, event.user_id, event.typing);
      return;

    case "presence":
      usePresence.getState().setPresence(event.user_id, event.online, event.last_seen_at);
      return;

    case "conversation.updated":
      void useChats.getState().load();
      if (useActiveConversation.getState().id === event.conversation_id) {
        void useMessages.getState().loadLatest(event.conversation_id);
      }
      return;

    case "error":
      if (event.client_id) {
        useMessages.getState().markFailed(event.client_id);
        useOutbox.getState().setTimer(event.client_id, null);
      }
      return;

    case "pong":
      return;

    default:
      return;
  }
}
