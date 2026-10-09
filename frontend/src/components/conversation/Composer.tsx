"use client";

import { Mic, Plus, Send, Smile } from "lucide-react";
import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import styles from "./Composer.module.css";
import { ComingSoonModal } from "@/components/shell/ComingSoonModal";
import { useTypingSender } from "@/hooks/useTypingSender";
import { sendChatMessage } from "@/lib/ws/realtime";

const MAX_INPUT_HEIGHT_PX = 60; // design-tokens §4: composer input scrolls past 72px outer height

/** design-tokens §4/§8.4: Enter sends, Shift+Enter inserts a newline, and the mic button swaps
 * for a send button the moment there's text (`dirty`). */
export function Composer({ conversationId }: { conversationId: number }) {
  const [text, setText] = useState("");
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { notifyTyping, stop } = useTypingSender(conversationId);

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

  return (
    <div className={styles.area}>
      <button type="button" className={styles.iconCell} aria-label="Add emoji" onClick={() => setComingSoon("Emoji")}>
        <Smile aria-hidden />
      </button>
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
