import { create } from "zustand";
import { conversationsApi } from "@/lib/endpoints";
import type { ConversationSummary } from "@/lib/types";

interface ChatsState {
  conversations: ConversationSummary[];
  loaded: boolean;
  load: () => Promise<void>;
  /** Insert or replace one chat. Phase 5's socket events will call this too. */
  upsert: (conv: ConversationSummary) => void;
}

// Most recent activity first: the order the spec and Signal both use.
function byRecent(a: ConversationSummary, b: ConversationSummary): number {
  return b.last_activity_at - a.last_activity_at;
}

export const useChats = create<ChatsState>((set) => ({
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
}));
