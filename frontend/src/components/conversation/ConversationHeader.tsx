"use client";

import { MoreVertical, Phone, Search, Video } from "lucide-react";
import { useState } from "react";
import styles from "./ConversationHeader.module.css";
import { ComingSoonModal } from "@/components/shell/ComingSoonModal";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { formatPresence } from "@/lib/time";
import type { ConversationSummary } from "@/lib/types";
import { usePresence } from "@/store/presence";

/** 52px header: avatar, name, presence subtitle, and the call/search/settings buttons, which all
 * open a Coming Soon modal — this clone has no calls or chat-settings screen (CLAUDE.md Rule 1). */
export function ConversationHeader({ conversation }: { conversation: ConversationSummary }) {
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const peerId = conversation.peer?.id;
  const online = usePresence((s) => (peerId != null ? s.isOnline(peerId) : false));
  const lastSeenAt = usePresence((s) => (peerId != null ? s.lastSeenAt[peerId] : undefined));

  const subtitle =
    conversation.type === "direct"
      ? formatPresence(online, lastSeenAt ?? conversation.peer?.last_seen_at ?? null)
      : `${conversation.member_count} members`;

  return (
    <div className={styles.header}>
      <button type="button" className={styles.identity} onClick={() => setComingSoon("Chat settings")}>
        <Avatar name={conversation.title} color={conversation.avatar_color} url={conversation.avatar_url} size={32} />
        <span>
          <div className={styles.name}>{conversation.title}</div>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </span>
      </button>
      <div className={styles.actions}>
        <IconButton label="Start a video call" onClick={() => setComingSoon("Video call")}>
          <Video aria-hidden />
        </IconButton>
        <IconButton label="Start a call" onClick={() => setComingSoon("Call")}>
          <Phone aria-hidden />
        </IconButton>
        <IconButton label="Search chat" onClick={() => setComingSoon("Search chat")}>
          <Search aria-hidden />
        </IconButton>
        <IconButton label="More actions" onClick={() => setComingSoon("Chat settings")}>
          <MoreVertical aria-hidden />
        </IconButton>
      </div>
      {comingSoon && <ComingSoonModal title={comingSoon} onClose={() => setComingSoon(null)} />}
    </div>
  );
}
