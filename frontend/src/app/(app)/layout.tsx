"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { startRealtime, stopRealtime } from "@/lib/ws/realtime";
import { useSession } from "@/store/session";

/**
 * Auth guard: no token -> /register. A valid token -> GET /me (a 401 there already
 * redirects, inside lib/api.ts's request()). Everything under (app) renders only
 * once this resolves, so a chat page never flashes before we know who "you" are.
 * The WebSocket connects right after: it's the one socket for the whole session, not
 * per-conversation, so it starts here rather than inside the chat screen.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const loadMe = useSession((s) => s.loadMe);

  useEffect(() => {
    loadMe().then((hasSession) => {
      if (!hasSession) router.replace("/register");
      else {
        setReady(true);
        startRealtime();
      }
    });
    return () => stopRealtime();
    // Runs once per mount; loadMe/router identities don't need to retrigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return null;
  return <AppShell>{children}</AppShell>;
}
