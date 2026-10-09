"use client";

import { Bell, LogOut, Lock, Palette, Phone, Sparkles, User } from "lucide-react";
import { useState } from "react";
import styles from "./SettingsPane.module.css";
import { AppearanceSettings } from "./AppearanceSettings";
import { ProfileSettings } from "./ProfileSettings";
import { ComingSoon } from "@/components/shell/ComingSoon";
import { useSession } from "@/store/session";

type Section = "profile" | "appearance" | "privacy" | "notifications" | "calls" | "stories";

const SECTIONS: { id: Section; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "privacy", label: "Privacy", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "calls", label: "Calls", icon: Phone },
  { id: "stories", label: "Stories", icon: Sparkles },
];

/** Settings screen: a sub-nav (reference/settings-appearance.png, trimmed to the sections this
 * phase covers) plus whichever section is selected. Logout lives here now, replacing the
 * nav-rail popover (D-39's temporary placement, now superseded). */
export function SettingsPane() {
  const [section, setSection] = useState<Section>("profile");
  const logout = useSession((s) => s.logout);

  return (
    <div className={styles.pane}>
      <nav className={styles.subnav} aria-label="Settings">
        <h1 className={styles.heading}>Settings</h1>
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`${styles.item} ${section === id ? styles.itemActive : ""}`}
            onClick={() => setSection(id)}
            aria-current={section === id}
          >
            <Icon size={18} aria-hidden />
            {label}
          </button>
        ))}
        <div className={styles.spacer} />
        <button type="button" className={styles.logout} onClick={() => logout()}>
          <LogOut size={18} aria-hidden />
          Log out
        </button>
      </nav>
      <div className={styles.content}>
        {section === "profile" && <ProfileSettings />}
        {section === "appearance" && <AppearanceSettings />}
        {section === "privacy" && <ComingSoon title="Privacy" />}
        {section === "notifications" && <ComingSoon title="Notifications" />}
        {section === "calls" && <ComingSoon title="Calls" />}
        {section === "stories" && <ComingSoon title="Stories" />}
      </div>
    </div>
  );
}
