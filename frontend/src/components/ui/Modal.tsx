"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Modal.module.css";

interface Props {
  title?: string;
  children: ReactNode;
  footer?: ReactNode; // buttons, right-aligned
  onClose: () => void;
}

/** Signal's legacy modal (design-tokens §7.9). Escape or a click on the backdrop closes it. */
export function Modal({ title, children, footer, onClose }: Props) {
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    // The primary action is the last button in the footer (e.g. PhoneConfirmModal's "Yes"),
    // matching reading order (secondary actions like "Edit"/"Cancel" come first). Focusing it
    // means a focused button's own default behaviour handles Enter-to-confirm for free.
    const buttons = footerRef.current?.querySelectorAll("button");
    buttons?.[buttons.length - 1]?.focus();
  }, []);

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      {/* stopPropagation: a click inside the dialog must not count as a backdrop click. */}
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title && (
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <button type="button" className={`${styles.close} focus-ring`} onClick={onClose} aria-label="Close">
              <X aria-hidden />
            </button>
          </div>
        )}
        <div className={`${styles.body} ${title ? "" : styles.bodyNoHeader}`}>{children}</div>
        {footer && (
          <div className={styles.footer} ref={footerRef}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
