// Who's currently typing, per conversation. Entries expire after 15s without a refresh
// (design-tokens §"Limits" / protocol doc: "Hide the dots after 15s without a refresh"),
// matching Signal's own receiver-side timeout rather than trusting a `typing: false` frame
// that might be lost.
import { create } from "zustand";

const EXPIRE_MS = 15_000;

// Shared, stable fallback for a conversation with no typing activity — a selector must never
// return a freshly-allocated object (e.g. `?? {}` inline), or React sees a "new" snapshot on
// every render and loops forever ("getSnapshot should be cached").
export const EMPTY_TYPING: Readonly<Record<number, boolean>> = {};

interface TypingState {
  typing: Record<number, Record<number, boolean>>; // conversationId -> userId -> isTyping
  timers: Record<string, ReturnType<typeof setTimeout>>; // `${conversationId}:${userId}` -> expiry timer
  setTyping: (conversationId: number, userId: number, isTyping: boolean) => void;
}

export const useTyping = create<TypingState>((set, get) => ({
  typing: {},
  timers: {},

  setTyping: (conversationId, userId, isTyping) => {
    const key = `${conversationId}:${userId}`;
    const existingTimer = get().timers[key];
    if (existingTimer) clearTimeout(existingTimer);

    if (!isTyping) {
      set((state) => {
        const convTyping = { ...(state.typing[conversationId] ?? {}) };
        delete convTyping[userId];
        const timers = { ...state.timers };
        delete timers[key];
        return { typing: { ...state.typing, [conversationId]: convTyping }, timers };
      });
      return;
    }

    const timer = setTimeout(() => get().setTyping(conversationId, userId, false), EXPIRE_MS);
    set((state) => ({
      typing: {
        ...state.typing,
        [conversationId]: { ...(state.typing[conversationId] ?? {}), [userId]: true },
      },
      timers: { ...state.timers, [key]: timer },
    }));
  },
}));
