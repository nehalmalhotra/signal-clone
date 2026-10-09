import { mediaUrl } from "@/lib/api";
import { avatarColors } from "@/lib/avatarColors";
import { initials } from "@/lib/names";
import styles from "./Avatar.module.css";

interface Props {
  name: string;
  color: string; // palette key, e.g. "A110"
  url: string | null; // relative API path, or null for the initials avatar
  size: number;
}

/** A photo if there is one, otherwise Signal's coloured initials circle. */
export function Avatar({ name, color, url, size }: Props) {
  const src = mediaUrl(url);
  const { bg, fg } = avatarColors(color);
  const box = { width: size, height: size };

  if (src) {
    // A plain <img>: avatars come from the API host, which next/image would need configuring for.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={styles.avatar} style={box} src={src} alt="" />;
  }
  return (
    <span
      className={styles.avatar}
      // Signal sizes initials at 45% of the avatar (design-tokens §1.5).
      style={{ ...box, background: bg, color: fg, fontSize: Math.ceil(size * 0.45) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
