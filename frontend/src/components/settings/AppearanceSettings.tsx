"use client";

import { Moon } from "lucide-react";
import styles from "./AppearanceSettings.module.css";
import { useTheme, type Theme } from "@/store/theme";

const OPTIONS: { value: Theme; label: string }[] = [
  // icu:themeLight / icu:themeDark / icu:themeSystem (design-tokens.md §7.1)
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/** Settings -> Appearance (reference/settings-appearance.png), trimmed to the Theme row — the
 * task only asked for the working theme switch, not Language/Chat color/Zoom level. */
export function AppearanceSettings() {
  const theme = useTheme((s) => s.theme);
  const setTheme = useTheme((s) => s.setTheme);

  return (
    <div className={styles.pane}>
      <h2 className={styles.title}>Appearance</h2>
      <div className={styles.card}>
        <div className={styles.row}>
          <Moon size={18} aria-hidden />
          {/* icu:Preferences--theme */}
          <span className={styles.label}>Theme</span>
          <select
            className={styles.select}
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
            aria-label="Theme"
          >
            {OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
