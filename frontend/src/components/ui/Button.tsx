import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "link" | "modal";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/**
 * primary/secondary: Signal's pill buttons (design-tokens §7.1).
 * link: text-only accent button ("Resend code").
 * modal: the squarer legacy button used in modal footers (§7.9).
 */
export function Button({ variant = "primary", className, type = "button", ...rest }: Props) {
  const classes = [styles.button, styles[variant], "focus-ring", className].filter(Boolean).join(" ");
  return <button type={type} className={classes} {...rest} />;
}
