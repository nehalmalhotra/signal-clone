import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import styles from "./TextInput.module.css";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  leading?: ReactNode; // e.g. the country-code picker in front of the phone number
  inputRef?: Ref<HTMLInputElement>;
}

/** Signal's text field (design-tokens §7.2): white box, hairline border, grey focus ring. */
export function TextInput({ leading, inputRef, className, ...rest }: Props) {
  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      {leading}
      <input ref={inputRef} className={styles.input} {...rest} />
    </div>
  );
}
