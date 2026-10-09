import styles from "./ContactRow.module.css";
import { Avatar } from "@/components/ui/Avatar";
import { fullName } from "@/lib/names";
import type { UserPublic } from "@/lib/types";

interface Props {
  user: UserPublic;
  subtitle?: string;
  onClick: () => void;
  disabled?: boolean;
}

/** One person in the Contacts list or a search result (design-tokens §4 row pattern, 56px variant). */
export function ContactRow({ user, subtitle, onClick, disabled }: Props) {
  const name = fullName(user);
  return (
    <button type="button" className={`${styles.row} focus-ring`} onClick={onClick} disabled={disabled}>
      <Avatar name={name} color={user.avatar_color} url={user.avatar_url} size={40} />
      <span className={styles.text}>
        <span className={styles.name}>{name}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </span>
    </button>
  );
}
