// TypeScript mirrors of the backend's response models (backend/app/models/*.py).
// All timestamps are milliseconds since the epoch (backend/app/clock.py).

export interface UserPublic {
  id: number;
  given_name: string;
  family_name: string | null;
  username: string | null;
  about: string | null;
  avatar_url: string | null; // relative to the API, e.g. "/media/avatars/x.png"
  avatar_color: string; // a key like "A110" (design-tokens §1.5)
  last_seen_at: number | null;
}

export interface Me extends UserPublic {
  phone_number: string;
  created_at: number;
}

export type MessageStatus = "sent" | "delivered" | "read";

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  client_id: string;
  kind: "text" | "group_update";
  body: string | null;
  meta: Record<string, unknown> | null;
  sent_at: number;
  status: MessageStatus | null; // only set on your own text messages
}

export interface ConversationSummary {
  id: number;
  type: "direct" | "group";
  title: string;
  avatar_url: string | null;
  avatar_color: string;
  peer: UserPublic | null;
  member_count: number;
  is_member: boolean;
  last_message: Message | null;
  unread_count: number;
  last_activity_at: number;
}

export interface VerifyResponse {
  status: "logged_in" | "profile_required";
  token?: string;
  user?: Me;
}

export interface SessionResponse {
  token: string;
  user: Me;
}
