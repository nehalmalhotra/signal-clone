// One conversation's message history, keyed by conversation id. Holds both server-confirmed
// messages and optimistic ("sending"/"error") ones from this tab's own outbox — the realtime
// router (lib/ws/realtime.ts) is the only thing that calls the mutating actions below from
// WebSocket events; components only read.
import { create } from "zustand";
import { messagesApi } from "@/lib/endpoints";
import { higherStatus, type LocalStatus } from "@/lib/messageStatus";
import type { Message, MessageStatus } from "@/lib/types";

export type { LocalStatus };

export interface StoredMessage extends Omit<Message, "status"> {
  status: LocalStatus | null;
}

interface ConversationMessages {
  items: StoredMessage[]; // oldest first, ready to render
  hasMore: boolean;
  loadingOlder: boolean;
  loaded: boolean;
}

// A single shared instance, not a factory: `get()` below is called from inside component
// selectors, and returning a fresh object on every call would make useSyncExternalStore see a
// "changed" snapshot on every render and loop forever ("getSnapshot should be cached").
const EMPTY_CONVERSATION: ConversationMessages = { items: [], hasMore: false, loadingOlder: false, loaded: false };

function sortBySentAt(items: StoredMessage[]): StoredMessage[] {
  return [...items].sort((a, b) => a.sent_at - b.sent_at || a.id - b.id);
}

interface MessagesState {
  byConversation: Record<number, ConversationMessages>;
  get: (conversationId: number) => ConversationMessages;
  loadLatest: (conversationId: number) => Promise<void>;
  loadOlder: (conversationId: number) => Promise<void>;
  /** Adds a local-only bubble with a negative temp id, swapped out by applyAck/applyNew. */
  addOptimistic: (conversationId: number, clientId: string, body: string, senderId: number) => StoredMessage;
  applyAck: (clientId: string, message: Message) => void;
  applyNew: (message: Message) => void;
  applyReceipt: (conversationId: number, messageIds: number[], status: MessageStatus) => void;
  markFailed: (clientId: string) => void;
  markSending: (clientId: string) => void;
}

/** Finds the optimistic (negative-id) bubble for a client_id across every loaded conversation
 * and replaces it; used by markFailed/markSending, which only know the client_id (the outbox
 * doesn't track which chat tab is looking at it). */
function updateOptimistic(
  byConversation: Record<number, ConversationMessages>,
  clientId: string,
  update: (msg: StoredMessage) => StoredMessage
): Record<number, ConversationMessages> {
  for (const [key, conv] of Object.entries(byConversation)) {
    const idx = conv.items.findIndex((m) => m.client_id === clientId && m.id < 0);
    if (idx < 0) continue;
    const items = conv.items.slice();
    items[idx] = update(items[idx]);
    return { ...byConversation, [key]: { ...conv, items } };
  }
  return byConversation;
}

export const useMessages = create<MessagesState>((set, get) => ({
  byConversation: {},

  get: (conversationId) => get().byConversation[conversationId] ?? EMPTY_CONVERSATION,

  loadLatest: async (conversationId) => {
    const page = await messagesApi.list(conversationId, { limit: 50 });
    set((state) => ({
      byConversation: {
        ...state.byConversation,
        [conversationId]: { items: page.messages, hasMore: page.has_more, loadingOlder: false, loaded: true },
      },
    }));
  },

  loadOlder: async (conversationId) => {
    const current = get().byConversation[conversationId];
    if (!current || !current.hasMore || current.loadingOlder || current.items.length === 0) return;

    set((state) => ({
      byConversation: { ...state.byConversation, [conversationId]: { ...current, loadingOlder: true } },
    }));
    const oldestId = current.items[0].id;
    const page = await messagesApi.list(conversationId, { beforeId: oldestId, limit: 50 });
    set((state) => {
      const existing = state.byConversation[conversationId] ?? current;
      return {
        byConversation: {
          ...state.byConversation,
          [conversationId]: {
            items: [...page.messages, ...existing.items],
            hasMore: page.has_more,
            loadingOlder: false,
            loaded: true,
          },
        },
      };
    });
  },

  addOptimistic: (conversationId, clientId, body, senderId) => {
    const optimistic: StoredMessage = {
      id: -Date.now(),
      conversation_id: conversationId,
      sender_id: senderId,
      client_id: clientId,
      kind: "text",
      body,
      meta: null,
      sent_at: Date.now(),
      status: "sending",
    };
    set((state) => {
      const current = state.byConversation[conversationId] ?? EMPTY_CONVERSATION;
      return {
        byConversation: {
          ...state.byConversation,
          [conversationId]: { ...current, items: [...current.items, optimistic] },
        },
      };
    });
    return optimistic;
  },

  applyAck: (clientId, message) => {
    set((state) => {
      const current = state.byConversation[message.conversation_id] ?? EMPTY_CONVERSATION;
      const stored: StoredMessage = { ...message, status: message.status ?? "sent" };
      const optimisticIdx = current.items.findIndex((m) => m.client_id === clientId && m.id < 0);
      let items: StoredMessage[];
      if (optimisticIdx >= 0) {
        items = current.items.map((m, i) => (i === optimisticIdx ? stored : m));
      } else if (!current.items.some((m) => m.id === stored.id)) {
        items = sortBySentAt([...current.items, stored]);
      } else {
        items = current.items;
      }
      return {
        byConversation: { ...state.byConversation, [message.conversation_id]: { ...current, items, loaded: true } },
      };
    });
  },

  applyNew: (message) => {
    set((state) => {
      const current = state.byConversation[message.conversation_id];
      // The chat isn't open in this tab (or hasn't loaded yet): the chat-list store handles the
      // preview/unread badge instead, and we'll fetch real history once it's opened.
      if (!current || !current.loaded) return state;
      if (current.items.some((m) => m.id === message.id)) return state; // dedupe by id (protocol doc)

      const stored: StoredMessage = { ...message, status: message.status ?? null };
      const optimisticIdx = current.items.findIndex((m) => m.client_id === message.client_id && m.id < 0);
      const items =
        optimisticIdx >= 0
          ? current.items.map((m, i) => (i === optimisticIdx ? stored : m))
          : sortBySentAt([...current.items, stored]);

      return {
        byConversation: { ...state.byConversation, [message.conversation_id]: { ...current, items } },
      };
    });
  },

  applyReceipt: (conversationId, messageIds, status) => {
    set((state) => {
      const current = state.byConversation[conversationId];
      if (!current) return state;
      const idSet = new Set(messageIds);
      const items = current.items.map((m) => (idSet.has(m.id) ? { ...m, status: higherStatus(m.status, status) } : m));
      return { byConversation: { ...state.byConversation, [conversationId]: { ...current, items } } };
    });
  },

  markFailed: (clientId) =>
    set((state) => ({ byConversation: updateOptimistic(state.byConversation, clientId, (m) => ({ ...m, status: "error" })) })),

  markSending: (clientId) =>
    set((state) => ({
      byConversation: updateOptimistic(state.byConversation, clientId, (m) => ({ ...m, status: "sending" })),
    })),
}));
