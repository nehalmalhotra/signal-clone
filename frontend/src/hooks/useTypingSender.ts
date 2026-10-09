"use client";

import { useCallback, useEffect, useRef } from "react";
import { sendTyping } from "@/lib/ws/realtime";

// Signal's own timings (design-tokens.md "Limits"): start on the first keystroke, refresh every
// 10s while typing continues, stop after 3s of no keystrokes.
const REFRESH_MS = 10_000;
const IDLE_MS = 3_000;

/** Call `notifyTyping()` on every keystroke in the composer; call `stop()` right before/after a
 * send, so the indicator clears immediately instead of waiting out the 3s idle timer. */
export function useTypingSender(conversationId: number) {
  const isTyping = useRef(false);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (isTyping.current) {
      sendTyping(conversationId, false);
      isTyping.current = false;
    }
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    refreshTimer.current = null;
    idleTimer.current = null;
  }, [conversationId]);

  const notifyTyping = useCallback(() => {
    if (!isTyping.current) {
      isTyping.current = true;
      sendTyping(conversationId, true);
      refreshTimer.current = setInterval(() => sendTyping(conversationId, true), REFRESH_MS);
    }
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stop, IDLE_MS);
  }, [conversationId, stop]);

  // Stop on unmount and whenever the conversation changes (leaving a chat mid-type shouldn't
  // leave the other person's dots spinning).
  useEffect(() => stop, [stop]);

  return { notifyTyping, stop };
}
