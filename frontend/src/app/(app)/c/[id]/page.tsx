"use client";

import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { useChats } from "@/store/chats";

/**
 * Placeholder for Phase 5, which replaces this with the full message thread and
 * wires it to the WebSocket. For now it proves routing and data loading work end to end.
 */
export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const conv = useChats((s) => s.conversations.find((c) => String(c.id) === params.id)) ?? null;

  if (!conv) return null;

  return (
    <div style={{ display: "flex", height: "100%", flexDirection: "column", background: "var(--conversation-bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, height: 52, padding: "0 16px", borderBottom: "1px solid var(--border-primary)" }}>
        <Avatar name={conv.title} color={conv.avatar_color} url={conv.avatar_url} size={32} />
        <strong>{conv.title}</strong>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--label-secondary)" }}>
        Messaging arrives in Phase 5.
      </div>
    </div>
  );
}
