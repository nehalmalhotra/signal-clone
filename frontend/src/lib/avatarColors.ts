// Signal's default-avatar palette: pastel background, saturated initials (design-tokens §1.5).
// The backend stores only the key (users.avatar_color), so the palette lives in one place here.

const PALETTE: Record<string, { bg: string; fg: string }> = {
  A100: { bg: "#e3e3fe", fg: "#3838f5" },
  A110: { bg: "#dde7fc", fg: "#1251d3" },
  A120: { bg: "#d8e8f0", fg: "#086da0" },
  A130: { bg: "#cde4cd", fg: "#067906" },
  A140: { bg: "#eae0fd", fg: "#661aff" },
  A150: { bg: "#f5e3fe", fg: "#9f00f0" },
  A160: { bg: "#f6d8ec", fg: "#b8057c" },
  A170: { bg: "#f5d7d7", fg: "#be0404" },
  A180: { bg: "#fef5d0", fg: "#836b01" },
  A190: { bg: "#eae6d5", fg: "#7d6f40" },
  A200: { bg: "#d2d2dc", fg: "#4f4f6d" },
  A210: { bg: "#d7d7d9", fg: "#5c5c5c" },
};

export function avatarColors(key: string): { bg: string; fg: string } {
  return PALETTE[key] ?? PALETTE.A100;
}
