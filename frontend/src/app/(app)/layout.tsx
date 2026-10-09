"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { useSession } from "@/store/session";

/**
 * Auth guard: no token -> /register. A valid token -> GET /me (a 401 there already
 * redirects, inside lib/api.ts's request()). Everything under (app) renders only
 * once this resolves, so a chat page never flashes before we know who "you" are.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const loadMe = useSession((s) => s.loadMe);

  useEffect(() => {
    loadMe().then((hasSession) => {
      if (!hasSession) router.replace("/register");
      else setReady(true);
    });
    // Runs once per mount; loadMe/router identities don't need to retrigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return null;
  return <AppShell>{children}</AppShell>;
}
