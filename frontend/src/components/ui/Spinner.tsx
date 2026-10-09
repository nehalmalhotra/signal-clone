import styles from "./Spinner.module.css";

/** A small rotating ring, used inside buttons while a request is in flight. */
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size, borderWidth: Math.max(1.5, size / 10) }}
      role="status"
      aria-label="Loading"
    />
  );
}
