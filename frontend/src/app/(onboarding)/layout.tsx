import type { ReactNode } from "react";

// Nothing beyond passing children through: each step wraps itself in <OnboardingCard>,
// because the phone step has a "Yes/Edit number" modal rendered as a sibling of the card.
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return children;
}
