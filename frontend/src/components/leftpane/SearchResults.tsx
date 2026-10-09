"use client";

import { useRouter } from "next/navigation";
import { ChatListItem } from "./ChatListItem";
import { ContactRow } from "./ContactRow";
import { SectionHeader } from "./SectionHeader";
import styles from "./ChatList.module.css";
import { conversationsApi } from "@/lib/endpoints";
import { searchChatsAndContacts } from "@/lib/search";
import { useChats } from "@/store/chats";
import { useContacts } from "@/store/contacts";

/** Filters the already-loaded chats and contacts into Signal's Contacts/Groups sections (§6.1). */
export function SearchResults({ query }: { query: string }) {
  const router = useRouter();
  const conversations = useChats((s) => s.conversations);
  const contacts = useContacts((s) => s.contacts);
  const { contacts: matchedContacts, groups } = searchChatsAndContacts(query, conversations, contacts);

  async function openDirect(userId: number) {
    const conv = await conversationsApi.openDirect(userId);
    useChats.getState().upsert(conv);
    router.push(`/c/${conv.id}`);
  }

  if (matchedContacts.length === 0 && groups.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptySubtitle}>No results for &quot;{query}&quot;</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {matchedContacts.length > 0 && (
        <>
          <SectionHeader>Contacts</SectionHeader>
          {matchedContacts.map((u) => (
            <ContactRow key={u.id} user={u} onClick={() => openDirect(u.id)} />
          ))}
        </>
      )}
      {groups.length > 0 && (
        <>
          <SectionHeader>Groups</SectionHeader>
          {groups.map((g) => (
            <ChatListItem key={g.id} conversation={g} selected={false} />
          ))}
        </>
      )}
    </div>
  );
}
