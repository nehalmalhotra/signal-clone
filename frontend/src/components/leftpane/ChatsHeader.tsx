"use client";

import { ListFilter, MoreHorizontal, SquarePen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./ChatsHeader.module.css";
import { IconButton } from "@/components/ui/IconButton";
import { SearchInput } from "@/components/ui/SearchInput";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onCompose: () => void;
  unreadOnly: boolean;
  onToggleUnreadOnly: () => void;
}

/** "Chats" title, compose/more buttons, search box and the unread filter (design-tokens §4, §7.5). */
export function ChatsHeader({ query, onQueryChange, onCompose, unreadOnly, onToggleUnreadOnly }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div className={styles.header}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Chats</h1>
        <div className={styles.actions}>
          <IconButton label="New chat" onClick={onCompose}>
            <SquarePen aria-hidden />
          </IconButton>
          <div ref={menuRef} style={{ position: "relative" }}>
            <IconButton label="More actions" onClick={() => setMenuOpen((v) => !v)}>
              <MoreHorizontal aria-hidden />
            </IconButton>
            {menuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute", top: 32, right: 0, zIndex: 20, minWidth: 180,
                  padding: 4, borderRadius: 8, background: "var(--surface-card)",
                  boxShadow: "0 8px 20px rgb(0 0 0 / 15%), 0 0 8px rgb(0 0 0 / 5%)",
                }}
              >
                {/* Only the items this app actually supports (CLAUDE.md: don't invent UI Signal lacks
                    that we also can't back with real behaviour). */}
                <MenuItem label="View Archive" disabled />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={styles.searchRow}>
        <SearchInput value={query} onChange={onQueryChange} placeholder="Search" />
        <button
          type="button"
          className={`${styles.filterButton} ${unreadOnly ? styles.active : ""}`}
          onClick={onToggleUnreadOnly}
          aria-pressed={unreadOnly}
          aria-label="Filter by unread"
          title="Filter by unread"
        >
          <ListFilter aria-hidden />
        </button>
      </div>
    </div>
  );
}

function MenuItem({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      style={{
        width: "100%", padding: "8px 10px", border: "none", borderRadius: 6, background: "none",
        textAlign: "left", fontSize: 13, color: disabled ? "var(--label-disabled)" : "var(--label-primary)",
      }}
    >
      {label}
    </button>
  );
}
