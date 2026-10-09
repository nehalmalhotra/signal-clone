import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./IconButton.module.css";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string; // read by screen readers and shown as the tooltip
  children: ReactNode; // the icon
  active?: boolean;
}

/** A 20px icon in a small rounded hover target, like Signal's header buttons (§7.5). */
export function IconButton({ label, children, active, className, type = "button", ...rest }: Props) {
  const classes = [styles.button, active && styles.active, "focus-ring", className].filter(Boolean).join(" ");
  return (
    <button type={type} className={classes} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}
