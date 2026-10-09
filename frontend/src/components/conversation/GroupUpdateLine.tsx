"use client";

import { UserPlus } from "lucide-react";
import styles from "./GroupUpdateLine.module.css";

interface Props {
  action: string;
  targetIds: number[];
  senderId: number;
  myId: number | undefined;
  nameOf: (userId: number) => string;
}

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/** One centered system line for a group_update message (reference/group-updates.png), e.g.
 * "Alice added Bob." Wording from design-tokens.md §8.8 (Signal-Desktop's GroupV2--* strings). */
export function GroupUpdateLine({ action, targetIds, senderId, myId, nameOf }: Props) {
  const actorIsMe = senderId === myId;
  const actor = actorIsMe ? "You" : nameOf(senderId);
  const targets = targetIds.map((id) => (id === myId ? "you" : nameOf(id)));

  let text: string;
  switch (action) {
    case "group_created":
      text = actorIsMe ? "You created the group." : `${actor} created the group.`;
      break;
    case "member_added":
      if (targetIds.length === 1 && targetIds[0] === senderId) {
        // The creator's own row in conversation_members never produces this, but guard anyway.
        text = `${actor} joined the group.`;
      } else {
        text = `${actor} added ${joinNames(targets)}.`;
      }
      break;
    case "member_removed":
      text = `${actor} removed ${joinNames(targets)}.`;
      break;
    case "member_left":
      text = `${actor} left the group.`;
      break;
    case "admin_granted":
      text = `${actor} made ${joinNames(targets)} an admin.`;
      break;
    case "admin_revoked":
      text = `${actor} removed ${joinNames(targets)} as admin.`;
      break;
    default:
      text = `${actor} updated the group.`;
  }

  return (
    <div className={styles.row}>
      <UserPlus size={12} aria-hidden />
      <span>{text}</span>
    </div>
  );
}
