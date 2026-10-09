"use client";

import { Mic, Plus, Send, Smile } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import styles from "./Composer.module.css";
import { ComingSoonModal } from "@/components/shell/ComingSoonModal";
import { EmojiPickerPopover } from "@/components/conversation/EmojiPickerPopover";
import { useTypingSender } from "@/hooks/useTypingSender";
import { sendChatMessage } from "@/lib/ws/realtime";

const MAX_INPUT_HEIGHT_PX = 60; // design-tokens §4: composer input scrolls past 72px outer height

/** design-tokens §4/§8.4: Enter sends, Shift+Enter inserts a newline, and the mic button swaps
 * for a send button the moment there's text (`dirty`). */
export function Composer({ conversationId }: { conversationId: number }) {
  const [text, setText] = useState("");
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiAnchorRef = useRef<HTMLDivElement>(null);
  const { notifyTyping, stop } = useTypingSender(conversationId);

  // Outside-click/Escape live on the anchor (button + popover together) so re-clicking the
  // toggle button closes the picker instead of the outside-click handler re-opening it.
  useEffect(() => {
    if (!emojiPickerOpen) return;
    function handlePointerDown(e: MouseEvent): void {
      if (emojiAnchorRef.current && !emojiAnchorRef.current.contains(e.target as Node)) {
        setEmojiPickerOpen(false);
      }
    }
    function handleKeyDown(e: globalThis.KeyboardEvent): void {
      if (e.key === "Escape") setEmojiPickerOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [emojiPickerOpen]);

  const dirty = text.trim().length > 0;

  function autoGrow(): void {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT_PX)}px`;
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>): void {
    setText(e.target.value);
    if (e.target.value) notifyTyping();
    else stop();
    autoGrow();
  }

  function handleSend(): void {
    const body = text.trim();
    if (!body) return;
    sendChatMessage(conversationId, body);
    stop();
    setText("");
    requestAnimationFrame(autoGrow); // reset the textarea height after React clears its value
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handlePickEmoji(emoji: string): void {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    notifyTyping();
    const cursor = start + emoji.length;
    // React re-renders the textarea asynchronously, so the selection/focus restore has to wait a tick.
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(cursor, cursor);
      autoGrow();
    });
  }

  return (
    <div className={styles.area}>
      <div className={styles.emojiAnchor} ref={emojiAnchorRef}>
        <button
          type="button"
          className={styles.iconCell}
          aria-label="Add emoji"
          onClick={() => setEmojiPickerOpen((open) => !open)}
        >
          <Smile aria-hidden />
        </button>
        {emojiPickerOpen && <EmojiPickerPopover onPick={handlePickEmoji} />}
      </div>
      <div className={styles.inputWrap}>
        <textarea
          ref={textareaRef}
          className={styles.input}
          rows={1}
          placeholder="Message"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </div>
      {dirty ? (
        <button type="button" className={styles.iconCell} aria-label="Send" onClick={handleSend}>
          <Send className={styles.sendActive} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          className={styles.iconCell}
          aria-label="Record a voice message"
          onClick={() => setComingSoon("Voice messages")}
        >
          <Mic aria-hidden />
        </button>
      )}
      <button type="button" className={styles.iconCell} aria-label="Add attachment" onClick={() => setComingSoon("Attachments")}>
        <Plus aria-hidden />
      </button>
      {comingSoon && <ComingSoonModal title={comingSoon} onClose={() => setComingSoon(null)} />}
    </div>
  );
}
