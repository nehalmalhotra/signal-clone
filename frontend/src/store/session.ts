import { create } from "zustand";
import { authApi, meApi } from "@/lib/endpoints";
import { clearToken, readToken, writeToken } from "@/lib/session";
import type { Me } from "@/lib/types";

interface SessionState {
  me: Me | null;
  /** Called after verify/register: remember the token and the user. */
  startSession: (token: string, me: Me) => void;
  /** On app load: returns false when there is no token (caller redirects to /register). */
  loadMe: () => Promise<boolean>;
  setMe: (me: Me) => void;
  logout: () => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  me: null,

  startSession: (token, me) => {
    writeToken(token);
    set({ me });
  },

  loadMe: async () => {
    if (!readToken()) return false;
    // A 401 here is handled inside request(): it clears the token and redirects.
    set({ me: await meApi.get() });
    return true;
  },

  setMe: (me) => set({ me }),

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      // Even if the server call fails, this device forgets the session. The full page
      // load resets every store, so nothing from this account stays in memory.
      clearToken();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload on purpose (preserving-ui-state.md "State and authentication")
      window.location.href = "/register";
    }
  },
}));
