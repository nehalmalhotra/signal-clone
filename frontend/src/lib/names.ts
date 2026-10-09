import type { UserPublic } from "./types";

type Named = Pick<UserPublic, "given_name" | "family_name">;

export function fullName(user: Named): string {
  return [user.given_name, user.family_name].filter(Boolean).join(" ");
}

/** Up to two initials for the default avatar: "Alice Chen" -> "AC", "Emma" -> "E". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => Array.from(w)[0].toUpperCase()) // Array.from keeps an emoji in one piece
    .join("");
}
