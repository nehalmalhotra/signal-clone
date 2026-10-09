// TypeScript mirrors of the frames in docs/websocket-protocol.md. The backend's definitions are
// in backend/app/realtime/events.py; these types follow that file field-for-field.
import type { Message, MessageStatus } from "@/lib/types";

// --- client -> server --------------------------------------------------------------

export type ClientEvent =
  | { type: "auth"; token: string }
  | { type: "message.send"; conversation_id: number; client_id: string; body: string }
  | { type: "message.read"; conversation_id: number; up_to_message_id: number }
  | { type: "typing"; conversation_id: number; typing: boolean }
  | { type: "ping" };

// --- server -> client --------------------------------------------------------------

export interface ReadyEvent {
  type: "ready";
  user_id: number;
  online_user_ids: number[];
}

export interface MessageAckEvent {
  type: "message.ack";
  client_id: string;
  message: Message;
}

export interface MessageNewEvent {
  type: "message.new";
  message: Message;
}

export interface ReceiptUpdateEvent {
  type: "receipt.update";
  conversation_id: number;
  message_ids: number[];
  user_id: number;
  status: MessageStatus;
  at: number;
}

export interface ReadSyncEvent {
  type: "read.sync";
  conversation_id: number;
  up_to_message_id: number;
}

export interface TypingEventIn {
  type: "typing";
  conversation_id: number;
  user_id: number;
  typing: boolean;
}

export interface PresenceEvent {
  type: "presence";
  user_id: number;
  online: boolean;
  last_seen_at: number | null;
}

export interface ConversationUpdatedEvent {
  type: "conversation.updated";
  conversation_id: number;
}

export type ErrorCode = "invalid_event" | "bad_request" | "forbidden" | "not_found" | "conflict" | "internal";

export interface ErrorEvent {
  type: "error";
  code: ErrorCode;
  detail: string;
  client_id?: string;
}

export interface PongEvent {
  type: "pong";
}

export type ServerEvent =
  | ReadyEvent
  | MessageAckEvent
  | MessageNewEvent
  | ReceiptUpdateEvent
  | ReadSyncEvent
  | TypingEventIn
  | PresenceEvent
  | ConversationUpdatedEvent
  | ErrorEvent
  | PongEvent;

export function parseServerEvent(raw: unknown): ServerEvent | null {
  if (typeof raw !== "object" || raw === null || !("type" in raw)) return null;
  // The server is the source of truth for shape; we trust it rather than re-validating every
  // field (this is a clone's frontend, not a security boundary — the backend already validates).
  return raw as ServerEvent;
}
