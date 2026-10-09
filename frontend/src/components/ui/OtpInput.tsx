"use client";

import { useRef } from "react";
import styles from "./OtpInput.module.css";

interface Props {
  length: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Six boxes, split 3+3 like the verification screen (design-tokens §7.1). Auto-advances; paste fills all. */
export function OtpInput({ length, value, onChange, disabled }: Props) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function setDigit(index: number, digit: string) {
    const digits = value.padEnd(length, " ").split("");
    digits[index] = digit;
    const next = digits.join("").replace(/ +$/, "");
    onChange(next);
    if (digit && index < length - 1) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    inputs.current[Math.min(text.length, length - 1)]?.focus();
  }

  return (
    <div className={styles.row} onPaste={handlePaste}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          className={[styles.box, i === Math.ceil(length / 2) - 1 ? styles.groupGap : ""].join(" ")}
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => setDigit(i, e.target.value.replace(/\D/g, "").slice(-1))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          autoFocus={i === 0}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
