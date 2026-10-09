"use client";

import { useEffect, useState } from "react";
import styles from "./LeftPane.module.css";
import { ChatsHeader } from "./ChatsHeader";
import { ChatList } from "./ChatList";
import { NewChatPanel } from "./NewChatPanel";
import { SearchResults } from "./SearchResults";
import { useChats } from "@/store/chats";
import { useContacts } from "@/store/contacts";

/** Switches between the chat list and the New chat panel (plan §file layout). */
export function LeftPane() {
  const [composing, setComposing] = useState(false);
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { load: loadChats, loaded } = useChats();
  const loadContacts = useContacts((s) => s.load);

  useEffect(() => {
    if (!loaded) loadChats();
    loadContacts();
    // Loaded once per mount: the chat list is re-fetched after every WebSocket (re)connect
    // starting Phase 5, not polled here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (composing) {
    return (
      <div className={styles.pane}>
        <NewChatPanel onClose={() => setComposing(false)} />
      </div>
    );
  }

  return (
    <div className={styles.pane}>
      <ChatsHeader
        query={query}
        onQueryChange={setQuery}
        onCompose={() => setComposing(true)}
        unreadOnly={unreadOnly}
        onToggleUnreadOnly={() => setUnreadOnly((v) => !v)}
      />
      {query.trim() ? <SearchResults query={query} /> : <ChatList unreadOnly={unreadOnly} />}
    </div>
  );
}
