import styles from "./EmptyPane.module.css";

/** Shown before any chat is open (design-tokens §7.4). */
export function EmptyPane() {
  return (
    <div className={styles.pane}>
      <div className={styles.logo} aria-hidden />
      <h2 className={styles.title}>Welcome to Signal</h2>
      <p className={styles.footer}>Signal is a 501c3 nonprofit</p>
    </div>
  );
}
