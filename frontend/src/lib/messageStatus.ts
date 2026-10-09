// Shared by store/messages.ts (per-bubble status) and store/chats.ts (the chat row's icon):
// a status only ever moves forward. Protocol doc: "Bubble status = highest across recipients" —
// and the same ordering stops a late `delivered` receipt from undoing a `read` that already arrived.
import type { MessageStatus } from "./types";

export type LocalStatus = MessageStatus | "sending" | "error";

const STATUS_RANK: Record<LocalStatus, number> = { sending: 0, sent: 1, delivered: 2, read: 3, error: -1 };

export function higherStatus(current: LocalStatus | null | undefined, incoming: MessageStatus): LocalStatus {
  if (!current) return incoming;
  return STATUS_RANK[incoming] > STATUS_RANK[current] ? incoming : current;
}

/** Same rule, narrowed to real server statuses — for the chat row's `last_message.status`, which
 * (unlike a bubble) is never locally "sending" or "error". */
export function higherMessageStatus(current: MessageStatus | null | undefined, incoming: MessageStatus): MessageStatus {
  return higherStatus(current, incoming) as MessageStatus;
}
