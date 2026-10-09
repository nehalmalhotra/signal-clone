"use client";

import { useEffect, useState } from "react";
import styles from "./TypingBubble.module.css";

/** design-tokens §8.3: an incoming-style bubble with 3 pulsing dots, shown while someone else is
 * typing. The animation pauses when the tab isn't visible (matches Signal's own rule). */
export function TypingBubble() {
  const [hidden, setHidden] = useState(() => typeof document !== "undefined" && document.hidden);

  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return (
    <div className={styles.wrap} aria-label="Typing">
      <div className={`${styles.bubble} ${hidden ? styles.paused : ""}`}>
        <span className={styles.dots}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </span>
      </div>
    </div>
  );
}
