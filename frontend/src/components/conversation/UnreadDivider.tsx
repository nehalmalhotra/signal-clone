/** design-tokens §1.3: a gray-45 line with "{n} Unread Message(s)" centered on it, body-2-bold. */
export function UnreadDivider({ count }: { count: number }) {
  const label = count === 1 ? "1 Unread Message" : `${count} Unread Messages`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px" }}>
      <span style={{ flex: 1, height: 1, background: "var(--divider-line)" }} />
      <span style={{ flexShrink: 0, fontSize: 13, lineHeight: "18px", fontWeight: 600, color: "var(--row-name)" }}>
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: "var(--divider-line)" }} />
    </div>
  );
}
