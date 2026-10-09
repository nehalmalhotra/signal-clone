/**
 * Original line art standing in for Signal's own logo files, which CLAUDE.md Rule 1 forbids
 * copying. Both read the shape from reference/onboarding-start.png (a filled circle ringed by
 * dashes) and reference/empty-pane.png (a speech bubble ringed by dashes) — redrawn, not traced.
 */

/** The small circular mark next to the "Signal" wordmark on the onboarding card. */
export function SignalWordmarkIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="11" fill="currentColor" />
      <circle
        cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="2"
        strokeDasharray="2.2 3.4" strokeLinecap="round"
      />
    </svg>
  );
}

/** The larger splash-screen mark on the empty right pane (design-tokens §7.4). */
export function SignalSplashIcon({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden>
      <circle
        cx="48" cy="48" r="46" fill="none" stroke="currentColor" strokeWidth="2.5"
        strokeDasharray="4 6" strokeLinecap="round"
      />
      {/* A speech bubble: a rounded body plus a small tail pointing down-left. */}
      <rect x="24" y="26" width="48" height="36" rx="18" fill="currentColor" />
      <path d="M33 58 L24 70 L40 59 Z" fill="currentColor" />
    </svg>
  );
}
