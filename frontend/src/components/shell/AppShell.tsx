"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./AppShell.module.css";
import { ComingSoon } from "./ComingSoon";
import { NavRail, type RailTab } from "./NavRail";
import { LeftPane } from "@/components/leftpane/LeftPane";
import { SettingsPane } from "@/components/settings/SettingsPane";
import { useTheme } from "@/store/theme";

/** Nav rail + left pane + whichever route is active on the right (design-tokens §7.3). */
export function AppShell({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<RailTab>("chats");
  const initTheme = useTheme((s) => s.init);

  useEffect(() => {
    initTheme();
    // Runs once per mount; the saved theme was already applied before paint by the inline
    // script in layout.tsx — this just wires the live system-theme listener and React state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.shell}>
      <NavRail active={tab} onSelect={setTab} onOpenProfileMenu={() => setTab("settings")} />
      {tab === "chats" ? (
        <>
          <LeftPane />
          <div className={styles.right}>{children}</div>
        </>
      ) : tab === "settings" ? (
        <div className={styles.right}>
          <SettingsPane />
        </div>
      ) : (
        <div className={styles.right}>
          <ComingSoon title={tab === "calls" ? "Calls" : "Stories"} />
        </div>
      )}
    </div>
  );
}
