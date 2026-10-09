import { Search, X } from "lucide-react";
import type { Ref } from "react";
import styles from "./SearchInput.module.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  /** The Find-by screens use the same box without the magnifier (§7.6). */
  showIcon?: boolean;
  inputMode?: "text" | "tel";
  onEnter?: () => void;
}

/** Signal's left-pane search box (design-tokens §4): 28px tall, grey fill, clear button. */
export function SearchInput({
  value, onChange, placeholder, autoFocus, inputRef, showIcon = true, inputMode = "text", onEnter,
}: Props) {
  return (
    <div className={styles.box}>
      {showIcon && <Search className={styles.icon} aria-hidden />}
      <input
        ref={inputRef}
        className={`${styles.input} ${showIcon ? "" : styles.noIcon}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onChange("");
          if (e.key === "Enter") onEnter?.();
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        inputMode={inputMode}
        spellCheck={false}
      />
      {value && (
        <button type="button" className={styles.clear} onClick={() => onChange("")} aria-label="Clear search">
          <X aria-hidden />
        </button>
      )}
    </div>
  );
}
