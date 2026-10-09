"use client";

import { useParams } from "next/navigation";
import { ConversationView } from "@/components/conversation/ConversationView";
import { useChats } from "@/store/chats";

/** Resolves the route param to a loaded conversation and hands off to ConversationView. The
 * `key` forces a full remount on every chat switch, so each chat's scroll position, frozen
 * unread-divider anchor, etc. always start clean rather than leaking from the previous one. */
export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const conv = useChats((s) => s.conversations.find((c) => String(c.id) === params.id)) ?? null;

  if (!conv) return null;

  return <ConversationView key={conv.id} conversation={conv} />;
}
