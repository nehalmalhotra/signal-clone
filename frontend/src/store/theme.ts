import { create } from "zustand";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "signal-clone.theme";

function resolveSystemIsDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Applies the effective theme to <html data-theme>, which globals.css's
 * `:root[data-theme="dark"]` block reads (design-tokens dark tokens, Phase 7 CLAUDE.md note). */
function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const dark = theme === "dark" || (theme === "system" && resolveSystemIsDark());
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Reads the saved preference and wires the system-theme media query listener; call once. */
  init: () => void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: "system",

  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },

  init: () => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    applyTheme(saved);
    set({ theme: saved });
    // Only matters while the preference is "system": the OS can switch while the tab is open.
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (get().theme === "system") applyTheme("system");
    });
  },
}));
