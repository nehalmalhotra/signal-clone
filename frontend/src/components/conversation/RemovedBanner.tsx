import styles from "./RemovedBanner.module.css";

/** Replaces the composer once you're no longer a member (removed, or you left). Layout from the
 * closest real analogue, the terminated-group banner (design-tokens §7.10,
 * reference/removed-member-closest.png); wording is Signal's own `icu:youLeftTheGroup`. */
export function RemovedBanner() {
  return (
    <div className={styles.banner} data-testid="removed-banner">
      You are no longer a member of the group.
    </div>
  );
}
