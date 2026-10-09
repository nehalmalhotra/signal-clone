"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { OnboardingCard } from "@/components/onboarding/OnboardingCard";
import { ApiError } from "@/lib/api";
import { authApi } from "@/lib/endpoints";
import { formatPhoneForDisplay } from "@/lib/phone";
import { useOnboarding } from "@/store/onboarding";
import { useSession } from "@/store/session";

export default function VerificationCodePage() {
  const router = useRouter();
  const { phoneNumber, setCode } = useOnboarding();
  const startSession = useSession((s) => s.startSession);
  const [digits, setDigits] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [calledMe, setCalledMe] = useState(false);

  // No phone number in memory (e.g. a page refresh): the step before this one never ran.
  useEffect(() => {
    if (!phoneNumber) router.replace("/register");
  }, [phoneNumber, router]);

  async function submit(code: string) {
    if (!phoneNumber || code.length !== 6 || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await authApi.verify(phoneNumber, code);
      if (res.status === "logged_in" && res.token && res.user) {
        startSession(res.token, res.user);
        router.push("/");
      } else {
        setCode(code);
        router.push("/register/profile");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Something went wrong. Try again.");
      setDigits("");
    } finally {
      setPending(false);
    }
  }

  if (!phoneNumber) return null;

  return (
    <OnboardingCard onBack={() => router.push("/register")}>
      <div style={{ height: 80 }} />
      <h1 style={{ fontSize: 18, lineHeight: "24px", fontWeight: 600, marginBottom: 8 }}>Verification code</h1>
      <p style={{ color: "var(--label-secondary)" }}>Enter the code we sent to {formatPhoneForDisplay(phoneNumber)}</p>
      <button
        type="button"
        onClick={() => router.push("/register")}
        style={{ border: "none", background: "none", color: "var(--label-primary)", fontWeight: 600, fontSize: 13, marginTop: 4 }}
      >
        Wrong number?
      </button>
      <div style={{ height: 32 }} />
      {/* The OTP already auto-submits at 6 digits via onChange; this form only exists so Enter
         does the same thing explicitly (task requirement) — a hidden submit button is required
         for a multi-input form to treat Enter as implicit submission. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (digits.length === 6 && !pending) submit(digits);
        }}
      >
        <OtpInput
          length={6}
          value={digits}
          onChange={(v) => {
            setDigits(v);
            setError(null);
            if (v.length === 6) submit(v);
          }}
          disabled={pending}
        />
        <button type="submit" className="sr-only" disabled={digits.length !== 6 || pending}>
          Continue
        </button>
      </form>
      {error && <p style={{ color: "var(--error)", fontSize: 13, marginTop: 12 }}>{error}</p>}
      <div style={{ height: 18 }} />
      <Button
        variant="link"
        disabled={resent}
        onClick={async () => {
          await authApi.requestCode(phoneNumber);
          setResent(true);
        }}
      >
        {resent ? "Code resent" : "Resend code"}
      </Button>
      <Button
        variant="link"
        disabled={calledMe}
        onClick={async () => {
          // Mocked: there's no real call to place, so this sends the same fixed OTP again
          // (D-15) — enough to demonstrate the control without a telephony integration.
          await authApi.requestCode(phoneNumber);
          setCalledMe(true);
        }}
      >
        {calledMe ? "Calling…" : "Call me"}
      </Button>
      <div style={{ flex: 1 }} />
    </OnboardingCard>
  );
}
