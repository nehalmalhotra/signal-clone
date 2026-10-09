// Client-side search over what is already loaded (D-40): the chat list and the contact list.
import { fullName } from "./names";
import type { ConversationSummary, UserPublic } from "./types";

export interface SearchResults {
  contacts: UserPublic[];
  groups: ConversationSummary[];
}

function matches(text: string | null | undefined, term: string): boolean {
  return !!text && text.toLocaleLowerCase().includes(term);
}

/**
 * Signal's result sections are "Contacts" and "Groups". People you have a 1:1 chat with
 * count as contacts too, even if you never added them, so both lists are merged by user id.
 */
export function searchChatsAndContacts(
  term: string,
  conversations: ConversationSummary[],
  contacts: UserPublic[],
): SearchResults {
  const q = term.trim().toLocaleLowerCase();
  if (!q) return { contacts: [], groups: [] };

  const people = new Map<number, UserPublic>();
  for (const c of contacts) people.set(c.id, c);
  for (const conv of conversations) {
    if (conv.peer && !people.has(conv.peer.id)) people.set(conv.peer.id, conv.peer);
  }

  const matchedContacts = [...people.values()]
    .filter((u) => matches(fullName(u), q) || matches(u.username, q))
    .sort((a, b) => fullName(a).localeCompare(fullName(b)));

  const matchedGroups = conversations.filter((c) => c.type === "group" && matches(c.title, q));

  return { contacts: matchedContacts, groups: matchedGroups };
}
