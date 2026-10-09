"use client";

import { Menu, MessageCircle, Phone, Settings2, Sparkles } from "lucide-react";
import { useState } from "react";
import styles from "./NavRail.module.css";
import { Avatar } from "@/components/ui/Avatar";
import { fullName } from "@/lib/names";
import { useSession } from "@/store/session";

export type RailTab = "chats" | "calls" | "stories" | "settings";

interface Props {
  active: RailTab;
  onSelect: (tab: RailTab) => void;
  onOpenProfileMenu: () => void;
}

// Order and icons from design-tokens §7.3: Chats, Calls, Stories, then Settings at the bottom.
const TABS: { id: RailTab; label: string; icon: typeof MessageCircle }[] = [
  { id: "chats", label: "Chats", icon: MessageCircle },
  { id: "calls", label: "Calls", icon: Phone },
  { id: "stories", label: "Stories", icon: Sparkles },
];

export function NavRail({ active, onSelect, onOpenProfileMenu }: Props) {
  const me = useSession((s) => s.me);
  // The hamburger at the top of reference/nav-rail.png is Signal's "Hide Tabs / Show Tabs"
  // toggle (design-tokens §6.1). Real Signal hides the whole rail with no on-screen way back
  // (it relies on a keyboard shortcut, which is Phase 7's job); narrowing to just the toggle
  // keeps a click-based way back in the meantime (D-45).
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav className={`${styles.rail} ${collapsed ? styles.collapsed : ""}`} aria-label="Primary">
      <button
        type="button"
        className={`${styles.toggle} focus-ring`}
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Show Tabs" : "Hide Tabs"}
        aria-pressed={collapsed}
      >
        <Menu aria-hidden />
      </button>
      {!collapsed && (
        <>
          <div className={styles.tabs}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`${styles.item} ${active === id ? styles.itemActive : ""}`}
                onClick={() => onSelect(id)}
                aria-current={active === id}
              >
                <span className={`${styles.itemButton} focus-ring`}>
                  <Icon aria-hidden />
                </span>
                <span className="sr-only">{label}</span>
              </button>
            ))}
          </div>
          <div className={styles.spacer} />
          <button
            type="button"
            className={`${styles.item} ${active === "settings" ? styles.itemActive : ""}`}
            onClick={() => onSelect("settings")}
          >
            <span className={`${styles.itemButton} focus-ring`}>
              <Settings2 aria-hidden />
            </span>
            <span className="sr-only">Settings</span>
          </button>
          {me && (
            <button type="button" className={`${styles.profile} focus-ring`} onClick={onOpenProfileMenu} aria-label="Your profile">
              <Avatar name={fullName(me)} color={me.avatar_color} url={me.avatar_url} size={28} />
            </button>
          )}
        </>
      )}
    </nav>
  );
}
