"use client";

import { Camera, ChevronLeft, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "./NewGroupPanel.module.css";
import contactRowStyles from "./ContactRow.module.css";
import { SectionHeader } from "./SectionHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { TextInput } from "@/components/ui/TextInput";
import { groupsApi } from "@/lib/endpoints";
import { fullName } from "@/lib/names";
import { useChats } from "@/store/chats";
import { useContacts } from "@/store/contacts";
import { useToast } from "@/store/toast";

type Step = "members" | "name";

interface Props {
  onClose: () => void;
}

const GROUP_NAME_MAX = 32; // design-tokens.md "Limits (non-visual)"

/** "New group" flow (reference/group-create.png, group-name.png): pick members, then name and
 * create. Member selection only (no own search backends here) — reuses the existing contacts list. */
export function NewGroupPanel({ onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("members");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contacts = useContacts((s) => s.contacts);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => fullName(c).toLocaleLowerCase().includes(q));
  }, [contacts, query]);

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleCreate() {
    if (!name.trim() || selected.length === 0 || creating) return;
    setCreating(true);
    setError(null);
    try {
      const conv = await groupsApi.create(name.trim(), selected);
      useChats.getState().upsert(conv);
      useToast.getState().show("Group created");
      router.push(`/c/${conv.id}`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the group");
    } finally {
      setCreating(false);
    }
  }

  if (step === "name") {
    const members = contacts.filter((c) => selected.includes(c.id));
    return (
      <>
        <div className={styles.header}>
          <button type="button" className={styles.back} onClick={() => setStep("members")} aria-label="Back">
            <ChevronLeft size={18} aria-hidden />
          </button>
          <h2 className={styles.headerTitle}>Name this group</h2>
        </div>
        <div className={styles.body}>
          <div className={styles.avatarPicker}>
            <div className={styles.avatarCircle}>
              <Users size={32} aria-hidden />
            </div>
            <span className={styles.avatarBadge}>
              <Camera size={12} aria-hidden />
            </span>
          </div>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, GROUP_NAME_MAX))}
            placeholder="Group 1"
            autoFocus
          />
          <SectionHeader>Members</SectionHeader>
          {members.map((m) => (
            <div key={m.id} className={contactRowStyles.row}>
              <Avatar name={fullName(m)} color={m.avatar_color} url={m.avatar_url} size={40} />
              <span className={contactRowStyles.text}>
                <span className={contactRowStyles.name}>{fullName(m)}</span>
              </span>
            </div>
          ))}
          {error && <p className={styles.error}>{error}</p>}
        </div>
        <div className={styles.footer}>
          <Button onClick={handleCreate} disabled={!name.trim() || creating}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.header}>
        <button type="button" className={styles.back} onClick={onClose} aria-label="Back">
          <ChevronLeft size={18} aria-hidden />
        </button>
        <h2 className={styles.headerTitle}>Choose members</h2>
      </div>
      <div className={styles.searchBox}>
        <SearchInput value={query} onChange={setQuery} placeholder="Name, username, or number" autoFocus />
      </div>
      <div className={styles.body}>
        {filtered.length > 0 && (
          <>
            <SectionHeader>Contacts</SectionHeader>
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`${contactRowStyles.row} focus-ring`}
                onClick={() => toggle(c.id)}
              >
                <Avatar name={fullName(c)} color={c.avatar_color} url={c.avatar_url} size={40} />
                <span className={contactRowStyles.text}>
                  <span className={contactRowStyles.name}>{fullName(c)}</span>
                </span>
                <span
                  className={styles.checkbox}
                  data-checked={selected.includes(c.id)}
                  aria-hidden
                />
              </button>
            ))}
          </>
        )}
        {filtered.length === 0 && query && <p className={styles.empty}>No contacts found</p>}
      </div>
      <div className={styles.footer}>
        <Button onClick={() => setStep("name")} disabled={selected.length === 0}>
          Next
        </Button>
      </div>
    </>
  );
}
