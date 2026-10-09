"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

const NEAR_BOTTOM_PX = 80;

/**
 * Keeps the timeline's scroll position sane across two kinds of updates:
 * - prepending older messages (loadOlder): the view must not jump, so the pixel distance from
 *   the bottom is preserved.
 * - appending a new message: scrolls to the bottom only if the user was already near it, or just
 *   sent the message themselves (Timeline calls `stickToBottom()` for that case).
 *
 * `beforeLoadOlder` must be called synchronously, before the older page is requested, so it can
 * snapshot the scroll height before React re-renders with the prepended items.
 */
export function useScrollAnchor(containerRef: RefObject<HTMLDivElement | null>, itemCount: number) {
  const distanceFromBottomOnPrepend = useRef<number | null>(null);
  const prevItemCount = useRef(itemCount);
  const stickToBottomNext = useRef(true);

  function beforeLoadOlder(): void {
    const el = containerRef.current;
    if (!el) return;
    distanceFromBottomOnPrepend.current = el.scrollHeight - el.scrollTop;
  }

  function onScroll(): void {
    const el = containerRef.current;
    if (!el) return;
    stickToBottomNext.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }

  /** Call right after sending a message, so the new bubble is guaranteed visible. */
  function stickToBottom(): void {
    stickToBottomNext.current = true;
  }

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const grew = itemCount > prevItemCount.current;
    prevItemCount.current = itemCount;

    if (distanceFromBottomOnPrepend.current != null) {
      el.scrollTop = el.scrollHeight - distanceFromBottomOnPrepend.current;
      distanceFromBottomOnPrepend.current = null;
    } else if (grew && stickToBottomNext.current) {
      el.scrollTop = el.scrollHeight;
    }
    // containerRef is a stable ref object; only itemCount should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemCount]);

  return { beforeLoadOlder, onScroll, stickToBottom };
}
