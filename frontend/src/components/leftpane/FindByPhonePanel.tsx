"use client";

import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import styles from "./NewChatPanel.module.css";
import { Button } from "@/components/ui/Button";
import { CountryCodeSelect } from "@/components/onboarding/CountryCodeSelect";
import { TextInput } from "@/components/ui/TextInput";
import { ApiError } from "@/lib/api";
import { contactsApi, conversationsApi, usersApi } from "@/lib/endpoints";
import { fullName } from "@/lib/names";
import { toE164 } from "@/lib/phone";
import { useContacts } from "@/store/contacts";
import { useToast } from "@/store/toast";
import type { ConversationSummary } from "@/lib/types";

interface Props {
  onBack: () => void;
  onFound: (conv: ConversationSummary) => void;
}

/** "Find by phone number" (design-tokens §7.6, §7.8). */
export function FindByPhonePanel({ onBack, onFound }: Props) {
  const [region, setRegion] = useState("US");
  const [code, setCode] = useState("1");
  const [localNumber, setLocalNumber] = useState("");
  const [pending, setPending] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const e164 = toE164(code, localNumber);

  async function lookup() {
    if (!e164 || pending) return;
    setPending(true);
    setNotFound(false);
    try {
      const user = await usersApi.lookup(e164);
      // "Find by ..." doubles as "add contact": the backend treats a repeat add as a no-op (D-41).
      await contactsApi.add(user.id);
      useContacts.getState().load();
      useToast.getState().show(`${fullName(user)} added to contacts`);
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
        <h2 className={styles.headerTitle}>Find by phone number</h2>
      </div>
      <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <CountryCodeSelect
          region={region}
          onChange={(r) => {
            setRegion(r);
            setCode(r === "US" || r === "CA" ? "1" : code);
          }}
        />
        <TextInput
          type="tel"
          inputMode="tel"
          placeholder="Phone number"
          value={localNumber}
          onChange={(e) => {
            setLocalNumber(e.target.value);
            setNotFound(false);
          }}
        />
        {notFound && (
          <p style={{ color: "var(--error)", fontSize: 13 }}>
            User not found. &quot;{e164}&quot; is not a Signal user.
          </p>
        )}
        <Button disabled={!e164 || pending} onClick={lookup}>
          {pending ? "Searching…" : "Next"}
        </Button>
      </div>
    </>
  );
}
