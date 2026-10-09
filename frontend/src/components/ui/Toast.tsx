"use client";

import styles from "./Toast.module.css";
import { useToast } from "@/store/toast";

/** Top-left stack of auto-dismissing toasts (reference/toast.png: a fixed dark pill, same in
 * both themes). Mounted once in the root layout so any screen can call useToast.show(). */
export function ToastContainer() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} type="button" className={styles.toast} onClick={() => dismiss(t.id)}>
          {t.message}
        </button>
      ))}
    </div>
  );
}
