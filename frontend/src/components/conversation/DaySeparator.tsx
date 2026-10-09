import { formatDaySeparator } from "@/lib/time";

/** design-tokens §8.2: centered, 20px padding, body-medium, label-secondary. No background in
 * the plain 1:1/group case. */
export function DaySeparator({ timestamp }: { timestamp: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
      <span style={{ fontSize: 13, lineHeight: "18px", letterSpacing: "-0.03px", color: "var(--label-secondary)" }}>
        {formatDaySeparator(timestamp)}
      </span>
    </div>
  );
}
