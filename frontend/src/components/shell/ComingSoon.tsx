import styles from "./EmptyPane.module.css";

/** Placeholder for tabs the spec allows to be mocked (Calls, Stories, Settings for now). */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className={styles.pane}>
      <h2 className={styles.title}>{title}</h2>
      <p style={{ color: "var(--label-secondary)", fontSize: 14 }}>Coming soon</p>
    </div>
  );
}
