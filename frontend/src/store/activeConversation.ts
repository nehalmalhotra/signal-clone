// Which conversation route is currently mounted, if any. Set by ConversationView on mount/unmount.
// Read by useMarkRead (together with document.visibilityState) and by chats.applyMessage, so a
// message arriving for the chat you're already looking at doesn't bump its unread badge.
import { create } from "zustand";

interface ActiveConversationState {
  id: number | null;
  setActive: (id: number | null) => void;
}

export const useActiveConversation = create<ActiveConversationState>((set) => ({
  id: null,
  setActive: (id) => set({ id }),
}));
