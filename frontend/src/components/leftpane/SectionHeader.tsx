/** "Contacts" / "Groups" labels above a group of rows (design-tokens §6.1). */
export function SectionHeader({ children }: { children: string }) {
  return (
    <div
      style={{
        padding: "8px 14px 4px",
        color: "var(--label-secondary)",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}
