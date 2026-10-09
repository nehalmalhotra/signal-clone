"use client";

import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { useEffect, useState } from "react";
import styles from "./EmojiPickerPopover.module.css";

/** Signal's emoji button opens a popover anchored above it (design-tokens §4: composer icon
 * row). We use emoji-picker-react rather than hand-rolling a picker + search; only the
 * wrapper/positioning/theming here is ours. Outside-click/Escape are handled by the parent
 * Composer, which owns the anchor (button + popover) the click boundary is drawn around. */
export function EmojiPickerPopover({ onPick }: { onPick: (emoji: string) => void }) {
  // theme.ts toggles <html data-theme>, not a store value we can select, so we read it directly.
  const [dark, setDark] = useState(() => document.documentElement.getAttribute("data-theme") === "dark");

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.getAttribute("data-theme") === "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.popover}>
      <EmojiPicker
        theme={dark ? Theme.DARK : Theme.LIGHT}
        onEmojiClick={(data: EmojiClickData) => onPick(data.emoji)}
        autoFocusSearch={false}
        lazyLoadEmojis
      />
    </div>
  );
}
