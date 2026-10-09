"use client";

import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import styles from "./NewChatPanel.module.css";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { ApiError } from "@/lib/api";
import { contactsApi, conversationsApi, usersApi } from "@/lib/endpoints";
import { useContacts } from "@/store/contacts";
import type { ConversationSummary } from "@/lib/types";

interface Props {
  onBack: () => void;
  onFound: (conv: ConversationSummary) => void;
}

/** "Find by username" (design-tokens §7.6, §7.8). */
export function FindByUsernamePanel({ onBack, onFound }: Props) {
  const [username, setUsername] = useState("");
  const [pending, setPending] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function lookup() {
    if (!username.trim() || pending) return;
    setPending(true);
    setNotFound(false);
    try {
      const user = await usersApi.lookup(username.trim());
      await contactsApi.add(user.id);
      useContacts.getState().load();
      const conv = await conversationsApi.openDirect(user.id);
      onFound(conv);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else throw err;
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className={styles.header}>
        <button type="button" className={`${styles.back} focus-ring`} onClick={onBack} aria-label="Back">
          <ChevronLeft size={18} aria-hidden />
        </button>
        <h2 className={styles.headerTitle}>Find by username</h2>
      </div>
      <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <TextInput
          placeholder="Username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setNotFound(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
        />
        <p style={{ color: "var(--label-secondary)", fontSize: 13 }}>
          Enter a username followed by a dot and its set of numbers.
        </p>
        {notFound && (
          <p style={{ color: "var(--error)", fontSize: 13 }}>
            @{username} is not a Signal user. Make sure you&apos;ve entered the complete username.
          </p>
        )}
        <Button disabled={!username.trim() || pending} onClick={lookup}>
          {pending ? "Searching…" : "Next"}
        </Button>
      </div>
    </>
  );
}
