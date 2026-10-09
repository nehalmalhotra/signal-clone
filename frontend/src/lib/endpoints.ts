// One typed function per backend route the frontend uses. Components never call fetch directly.
import { request } from "./api";
import type { ConversationSummary, Me, SessionResponse, UserPublic, VerifyResponse } from "./types";

export const authApi = {
  requestCode: (phone_number: string) =>
    request<{ code_sent: boolean }>("/auth/request-code", { method: "POST", json: { phone_number } }),

  verify: (phone_number: string, code: string) =>
    request<VerifyResponse>("/auth/verify", { method: "POST", json: { phone_number, code } }),

  register: (body: { phone_number: string; code: string; given_name: string; family_name: string | null }) =>
    request<SessionResponse>("/auth/register", { method: "POST", json: body }),

  logout: () => request<void>("/auth/logout", { method: "POST" }),
};

export const meApi = {
  get: () => request<Me>("/me"),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Me>("/me/avatar", { method: "PUT", form });
  },
};

export const usersApi = {
  /** Exact phone number (starting with "+") or username. 404 if nobody matches. */
  lookup: (query: string) => request<UserPublic>(`/users/lookup?query=${encodeURIComponent(query)}`),
};

export const contactsApi = {
  list: () => request<UserPublic[]>("/contacts"),
  add: (user_id: number) => request<UserPublic>("/contacts", { method: "POST", json: { user_id } }),
};

export const conversationsApi = {
  list: () => request<ConversationSummary[]>("/conversations"),
  /** Returns the existing 1:1 chat with that user, or creates it. */
  openDirect: (user_id: number) =>
    request<ConversationSummary>("/conversations/direct", { method: "POST", json: { user_id } }),
};
