"use client";

import { MoreVertical, Phone, Search, Video } from "lucide-react";
import { useState } from "react";
import styles from "./ConversationHeader.module.css";
import { GroupDetailsModal } from "./GroupDetailsModal";
import { ComingSoonModal } from "@/components/shell/ComingSoonModal";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { formatPresence } from "@/lib/time";
import type { ConversationSummary, Member } from "@/lib/types";
import { usePresence } from "@/store/presence";
import { useSession } from "@/store/session";

/** 52px header: avatar, name, presence subtitle, and the call/search/settings buttons. For a
 * group, the name/avatar open the group details panel; everything else still opens Coming Soon
 * (this clone has no calls or 1:1 chat-settings screen, CLAUDE.md Rule 1). */
export function ConversationHeader({
  conversation, members,
}: {
  conversation: ConversationSummary;
  members: Member[];
}) {
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const peerId = conversation.peer?.id;
  const online = usePresence((s) => (peerId != null ? s.isOnline(peerId) : false));
  const lastSeenAt = usePresence((s) => (peerId != null ? s.lastSeenAt[peerId] : undefined));
  const isGroup = conversation.type === "group";
  const myId = useSession((s) => s.me?.id);
  const myRole = members.find((m) => m.user.id === myId)?.role ?? null;

  const subtitle =
    conversation.type === "direct"
      ? formatPresence(online, lastSeenAt ?? conversation.peer?.last_seen_at ?? null)
      : `${conversation.member_count} members`;

  return (
    <div className={styles.header}>
      <button
        type="button"
        className={styles.identity}
        onClick={() => (isGroup ? setShowGroupDetails(true) : setComingSoon("Chat settings"))}
      >
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
      {showGroupDetails && (
        <GroupDetailsModal
          conversation={conversation}
          members={members}
          myRole={myRole}
          onClose={() => setShowGroupDetails(false)}
        />
      )}
    </div>
  );
}
