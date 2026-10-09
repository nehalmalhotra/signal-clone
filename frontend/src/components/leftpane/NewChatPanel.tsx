"use client";

import { AtSign, ChevronLeft, Hash, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "./NewChatPanel.module.css";
import { ContactRow } from "./ContactRow";
import { FindByPhonePanel } from "./FindByPhonePanel";
import { FindByUsernamePanel } from "./FindByUsernamePanel";
import { SectionHeader } from "./SectionHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { fullName } from "@/lib/names";
import { conversationsApi } from "@/lib/endpoints";
import { useChats } from "@/store/chats";
import { useContacts } from "@/store/contacts";

type Mode = "root" | "find-username" | "find-phone";

interface Props {
  onClose: () => void;
}

/** The "New chat" panel (design-tokens §7.6, reference/new-chat.png). */
export function NewChatPanel({ onClose }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("root");
  const [query, setQuery] = useState("");
  const contacts = useContacts((s) => s.contacts);
  // Select the raw array, then derive: a selector that returns `.filter()`'s result makes a
  // new array every render, so Zustand's snapshot never compares equal and React loops forever.
  const conversations = useChats((s) => s.conversations);
  const groups = useMemo(() => conversations.filter((c) => c.type === "group"), [conversations]);

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => fullName(c).toLocaleLowerCase().includes(q));
  }, [contacts, query]);

  async function openDirect(userId: number) {
    const conv = await conversationsApi.openDirect(userId);
    useChats.getState().upsert(conv);
    router.push(`/c/${conv.id}`);
    onClose();
  }

  function onConnected(conv: Awaited<ReturnType<typeof conversationsApi.openDirect>>) {
    useChats.getState().upsert(conv);
    router.push(`/c/${conv.id}`);
    onClose();
  }

  if (mode === "find-username") {
    return <FindByUsernamePanel onBack={() => setMode("root")} onFound={onConnected} />;
  }
  if (mode === "find-phone") {
    return <FindByPhonePanel onBack={() => setMode("root")} onFound={onConnected} />;
  }

  return (
    <>
      <div className={styles.header}>
        <button type="button" className={`${styles.back} focus-ring`} onClick={onClose} aria-label="Back">
          <ChevronLeft size={18} aria-hidden />
        </button>
        <h2 className={styles.headerTitle}>New chat</h2>
      </div>
      <div className={styles.searchBox}>
        <SearchInput value={query} onChange={setQuery} placeholder="Name, username, or number" autoFocus />
      </div>
      <div className={styles.body}>
        <StepRow icon={<Users aria-hidden />} label="New group" onClick={() => {}} disabled />
        <StepRow icon={<AtSign aria-hidden />} label="Find by username" onClick={() => setMode("find-username")} />
        <StepRow icon={<Hash aria-hidden />} label="Find by phone number" onClick={() => setMode("find-phone")} />

        {filteredContacts.length > 0 && (
          <>
            <SectionHeader>Contacts</SectionHeader>
            {filteredContacts.map((c) => (
              <ContactRow key={c.id} user={c} onClick={() => openDirect(c.id)} />
            ))}
          </>
        )}

        {groups.length > 0 && (
          <>
            <SectionHeader>Groups</SectionHeader>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                className={styles.stepRow}
                onClick={() => {
                  router.push(`/c/${g.id}`);
                  onClose();
                }}
              >
                {g.title}
              </button>
            ))}
          </>
        )}

        {filteredContacts.length === 0 && groups.length === 0 && query && (
          <p className={styles.empty}>No contacts found</p>
        )}
      </div>
    </>
  );
}

function StepRow({
  icon, label, onClick, disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={styles.stepRow}
      onClick={onClick}
      disabled={disabled}
      style={disabled ? { color: "var(--label-disabled)" } : undefined}
      title={disabled ? "Coming soon" : undefined}
    >
      <span className={styles.stepIcon}>{icon}</span>
      {label}
    </button>
  );
}
