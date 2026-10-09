import { create } from "zustand";

// Carries values between the three registration screens. Kept in memory only: after a
// refresh the steps see an empty phone number and send you back to the first screen.
interface OnboardingState {
  phoneNumber: string | null; // E.164, e.g. "+12025550100"
  code: string | null; // needed again by /auth/register (the server keeps no "verified" state)
  setPhoneNumber: (phone: string) => void;
  setCode: (code: string) => void;
}

export const useOnboarding = create<OnboardingState>((set) => ({
  phoneNumber: null,
  code: null,
  setPhoneNumber: (phoneNumber) => set({ phoneNumber, code: null }),
  setCode: (code) => set({ code }),
}));
