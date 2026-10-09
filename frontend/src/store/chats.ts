import { create } from "zustand";
import { conversationsApi } from "@/lib/endpoints";
import { higherMessageStatus } from "@/lib/messageStatus";
import type { ConversationSummary, Message, MessageStatus } from "@/lib/types";

interface ChatsState {
  conversations: ConversationSummary[];
  loaded: boolean;
  load: () => Promise<void>;
  /** Insert or replace one chat, moving it to the top. */
  upsert: (conv: ConversationSummary) => void;
  /** A live `message.new`: updates the preview/timestamp and bumps the unread badge unless the
   * message is mine or the chat is open and visible right now (it's about to be marked read). */
  applyMessage: (message: Message, opts: { mine: boolean; isOpenAndVisible: boolean }) => void;
  /** A live `receipt.update`: moves the row's status icon forward when it's for the last message. */
  applyReceipt: (conversationId: number, messageIds: number[], status: MessageStatus) => void;
  /** My own `message.read` (or another tab's, via `read.sync`): clears the unread badge. */
  clearUnread: (conversationId: number) => void;
  /** True while conversation `id` is unknown locally — the caller should re-fetch the list over REST. */
  has: (conversationId: number) => boolean;
}

// Most recent activity first: the order the spec and Signal both use.
function byRecent(a: ConversationSummary, b: ConversationSummary): number {
  return b.last_activity_at - a.last_activity_at;
}

export const useChats = create<ChatsState>((set, get) => ({
  conversations: [],
  loaded: false,

  load: async () => {
    const list = await conversationsApi.list();
    set({ conversations: [...list].sort(byRecent), loaded: true });
  },

  upsert: (conv) =>
    set((state) => ({
      conversations: [conv, ...state.conversations.filter((c) => c.id !== conv.id)].sort(byRecent),
    })),

  applyMessage: (message, { mine, isOpenAndVisible }) => {
    const conv = get().conversations.find((c) => c.id === message.conversation_id);
    if (!conv) return; // unknown chat (e.g. a brand-new conversation); caller re-fetches instead
    get().upsert({
      ...conv,
      last_message: message,
      last_activity_at: message.sent_at,
      unread_count: mine || isOpenAndVisible ? conv.unread_count : conv.unread_count + 1,
    });
  },

  applyReceipt: (conversationId, messageIds, status) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId && c.last_message && messageIds.includes(c.last_message.id)
          ? { ...c, last_message: { ...c.last_message, status: higherMessageStatus(c.last_message.status, status) } }
          : c
      ),
    })),

  clearUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)),
    })),

  has: (conversationId) => get().conversations.some((c) => c.id === conversationId),
}));
