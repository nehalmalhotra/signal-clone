import { describe, expect, it } from "vitest";
import { searchChatsAndContacts } from "./search";
import type { ConversationSummary, UserPublic } from "./types";

const user = (id: number, given: string, family: string | null, username: string | null = null): UserPublic => ({
  id, given_name: given, family_name: family, username, about: null, avatar_url: null,
  avatar_color: "A100", last_seen_at: null,
});

const conv = (id: number, type: "direct" | "group", title: string, peer: UserPublic | null): ConversationSummary => ({
  id, type, title, peer, avatar_url: null, avatar_color: "A100", member_count: 2, is_member: true,
  last_message: null, unread_count: 0, last_activity_at: 0,
});

const alice = user(1, "Alice", "Chen", "alice.42");
const bob = user(2, "Bob", "Okafor");
const chats = [conv(10, "direct", "Bob Okafor", bob), conv(11, "group", "Book club", null)];

describe("searchChatsAndContacts", () => {
  it("returns nothing for a blank term", () => {
    expect(searchChatsAndContacts("  ", chats, [alice])).toEqual({ contacts: [], groups: [] });
  });

  it("matches names case-insensitively and includes 1:1 peers who aren't saved contacts", () => {
    const r = searchChatsAndContacts("O", chats, [alice]);
    expect(r.contacts.map((u) => u.id)).toEqual([2]);
    expect(r.groups.map((c) => c.id)).toEqual([11]);
  });

  it("matches usernames", () => {
    expect(searchChatsAndContacts("alice.4", chats, [alice]).contacts).toEqual([alice]);
  });

  it("does not list a person twice", () => {
    expect(searchChatsAndContacts("bob", chats, [bob]).contacts).toHaveLength(1);
  });
});
