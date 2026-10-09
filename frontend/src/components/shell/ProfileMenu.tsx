"use client";

import { useEffect, useRef } from "react";
import styles from "./ProfileMenu.module.css";
import { useSession } from "@/store/session";

interface Props {
  onClose: () => void;
}

/**
 * Logout lives here for now; Phase 7 moves it into the Settings "Coming Soon" pane
 * alongside the other preference placeholders (D-39).
 */
export function ProfileMenu({ onClose }: Props) {
  const logout = useSession((s) => s.logout);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [onClose]);

  return (
    <div ref={ref} className={styles.menu} role="menu">
      <button type="button" className={styles.item} role="menuitem" onClick={logout}>
        Log out
      </button>
    </div>
  );
}
