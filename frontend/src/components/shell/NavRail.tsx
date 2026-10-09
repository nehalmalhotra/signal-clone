"use client";

import { MessageCircle, Phone, Settings2, Sparkles } from "lucide-react";
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

  return (
    <nav className={styles.rail} aria-label="Primary">
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
    </nav>
  );
}
