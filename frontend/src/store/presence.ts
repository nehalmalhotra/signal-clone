// Online/last-seen state (D-12, D-31): "online" is never stored, only derived from the `ready`
// snapshot and live `presence` events; last_seen_at is the one persisted value, read from /me
// and /contacts and updated here when a `presence` event says someone went offline.
import { create } from "zustand";

interface PresenceState {
  online: Set<number>;
  lastSeenAt: Record<number, number | null>;
  /** Seeds online state from the `ready` frame's online_user_ids. */
  setOnlineSnapshot: (userIds: number[]) => void;
  setPresence: (userId: number, online: boolean, lastSeenAt: number | null) => void;
  isOnline: (userId: number) => boolean;
}

export const usePresence = create<PresenceState>((set, get) => ({
  online: new Set(),
  lastSeenAt: {},

  setOnlineSnapshot: (userIds) => set({ online: new Set(userIds) }),

  setPresence: (userId, online, lastSeenAt) =>
    set((state) => {
      const next = new Set(state.online);
      if (online) next.add(userId);
      else next.delete(userId);
      return { online: next, lastSeenAt: { ...state.lastSeenAt, [userId]: lastSeenAt } };
    }),

  isOnline: (userId) => get().online.has(userId),
}));
