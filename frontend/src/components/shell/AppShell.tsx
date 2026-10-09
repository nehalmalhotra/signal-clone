"use client";

import { useState, type ReactNode } from "react";
import styles from "./AppShell.module.css";
import { ComingSoon } from "./ComingSoon";
import { NavRail, type RailTab } from "./NavRail";
import { ProfileMenu } from "./ProfileMenu";
import { LeftPane } from "@/components/leftpane/LeftPane";

/** Nav rail + left pane + whichever route is active on the right (design-tokens §7.3). */
export function AppShell({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<RailTab>("chats");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <NavRail active={tab} onSelect={setTab} onOpenProfileMenu={() => setMenuOpen((v) => !v)} />
      {menuOpen && <ProfileMenu onClose={() => setMenuOpen(false)} />}
      {tab === "chats" ? (
        <>
          <LeftPane />
          <div className={styles.right}>{children}</div>
        </>
      ) : (
        <div className={styles.right}>
          <ComingSoon title={tab === "calls" ? "Calls" : tab === "stories" ? "Stories" : "Settings"} />
        </div>
      )}
    </div>
  );
}
