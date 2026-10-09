"use client";

import { UserMinus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "./GroupDetailsModal.module.css";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { conversationsApi, groupsApi } from "@/lib/endpoints";
import { fullName } from "@/lib/names";
import type { ConversationSummary, Member } from "@/lib/types";
import { useContacts } from "@/store/contacts";
import { useSession } from "@/store/session";

interface Props {
  conversation: ConversationSummary;
  members: Member[];
  myRole: "admin" | "member" | null;
  onClose: () => void;
}

/** Group details panel (reference/group-members.png), trimmed to what Phase 6 asks for: member
 * list with Admin labels, add/remove for admins, and leave for anyone. Shown as a Modal rather
 * than Signal's full right-hand panel — a time-boxed deviation (DECISIONS.md). */
export function GroupDetailsModal({ conversation, members: initialMembers, myRole: initialRole, onClose }: Props) {
  const router = useRouter();
  const myId = useSession((s) => s.me?.id);
  const [members, setMembers] = useState(initialMembers);
  const [myRole, setMyRole] = useState(initialRole);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const isAdmin = myRole === "admin";

  const contacts = useContacts((s) => s.contacts);
  const memberIds = useMemo(() => new Set(members.map((m) => m.user.id)), [members]);
  const addable = useMemo(() => contacts.filter((c) => !memberIds.has(c.id)), [contacts, memberIds]);

  async function refresh() {
    const detail = await conversationsApi.getDetail(conversation.id);
    setMembers(detail.members);
    setMyRole(detail.my_role);
  }

  async function addMember(userId: number) {
    setBusyId(userId);
    setError(null);
    try {
      await groupsApi.addMembers(conversation.id, [userId]);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that member");
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember(userId: number) {
    setBusyId(userId);
    setError(null);
    try {
      await groupsApi.removeMember(conversation.id, userId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove that member");
    } finally {
      setBusyId(null);
    }
  }

  async function leave() {
    if (myId == null) return;
    setBusyId(myId);
    setError(null);
    try {
      await groupsApi.removeMember(conversation.id, myId);
      onClose();
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't leave the group");
      setBusyId(null);
    }
  }

  return (
    <Modal title="Group settings" onClose={onClose}>
      <div className={styles.identity}>
        <Avatar name={conversation.title} color={conversation.avatar_color} url={conversation.avatar_url} size={64} />
        <div className={styles.name}>{conversation.title}</div>
        <div className={styles.subtitle}>{members.length} members</div>
      </div>

      <div className={styles.sectionHeader}>{members.length} members</div>
      <div className={styles.list}>
        {members.map((m) => (
          <div key={m.user.id} className={styles.row}>
            <Avatar name={fullName(m.user)} color={m.user.avatar_color} url={m.user.avatar_url} size={40} />
            <span className={styles.text}>
              <span className={styles.rowName}>{m.user.id === myId ? "You" : fullName(m.user)}</span>
            </span>
            {m.role === "admin" && <span className={styles.adminLabel}>Admin</span>}
            {isAdmin && m.user.id !== myId && (
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => removeMember(m.user.id)}
                disabled={busyId === m.user.id}
                aria-label={`Remove ${fullName(m.user)}`}
                title="Remove from group"
              >
                <UserMinus size={16} aria-hidden />
              </button>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <>
          <button type="button" className={styles.addToggle} onClick={() => setAdding((v) => !v)}>
            <UserPlus size={16} aria-hidden />
            Add members
          </button>
          {adding && (
            <div className={styles.list}>
              {addable.length === 0 && <p className={styles.empty}>All your contacts are already in this group</p>}
              {addable.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={styles.row}
                  onClick={() => addMember(c.id)}
                  disabled={busyId === c.id}
                >
                  <Avatar name={fullName(c)} color={c.avatar_color} url={c.avatar_url} size={40} />
                  <span className={styles.text}>
                    <span className={styles.rowName}>{fullName(c)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.footer}>
        <Button variant="secondary" onClick={leave} disabled={busyId === myId}>
          Leave group
        </Button>
      </div>
    </Modal>
  );
}
