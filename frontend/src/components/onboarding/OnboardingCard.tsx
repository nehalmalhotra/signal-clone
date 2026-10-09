"use client";

import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./OnboardingCard.module.css";
import { SignalWordmarkIcon } from "@/components/icons/BrandMarks";

interface Props {
  children: ReactNode;
  onBack?: () => void;
}

/** The shared frame for every registration step (design-tokens §7.1). */
export function OnboardingCard({ children, onBack }: Props) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.logo}>
        <SignalWordmarkIcon />
        Signal
      </div>
      <div className={styles.card}>
        {onBack && (
          <button type="button" className={`${styles.back} focus-ring`} onClick={onBack} aria-label="Back">
            <ChevronLeft size={18} aria-hidden />
          </button>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
