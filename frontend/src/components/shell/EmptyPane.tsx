import styles from "./EmptyPane.module.css";
import { SignalSplashIcon } from "@/components/icons/BrandMarks";

/**
 * Shown before any chat is open (design-tokens §7.4, reference/empty-pane.png). The "See
 * what's new" link and the nonprofit line are left out on request — just the mark and title.
 */
export function EmptyPane() {
  return (
    <div className={styles.pane}>
      <div className={styles.logo}>
        <SignalSplashIcon />
      </div>
      <h2 className={styles.title}>Welcome to Signal</h2>
    </div>
  );
}
