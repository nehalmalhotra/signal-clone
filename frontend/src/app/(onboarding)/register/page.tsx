"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { CountryCodeSelect } from "@/components/onboarding/CountryCodeSelect";
import { OnboardingCard } from "@/components/onboarding/OnboardingCard";
import { PhoneConfirmModal } from "@/components/onboarding/PhoneConfirmModal";
import { ApiError } from "@/lib/api";
import { authApi } from "@/lib/endpoints";
import { sanitizeLocalNumber, toE164 } from "@/lib/phone";
import { useOnboarding } from "@/store/onboarding";

export default function PhoneNumberPage() {
  const router = useRouter();
  const setPhoneNumber = useOnboarding((s) => s.setPhoneNumber);
  const [region, setRegion] = useState("US");
  const [code, setCode] = useState("1");
  const [localNumber, setLocalNumber] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const e164 = toE164(code, localNumber);

  async function sendCode() {
    if (!e164) return;
    setPending(true);
    setError(null);
    try {
      await authApi.requestCode(e164);
      setPhoneNumber(e164);
      router.push("/register/verify");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Something went wrong. Try again.");
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  return (
    <OnboardingCard onBack={() => router.back()}>
      <div style={{ height: 52 }} />
      <h1 style={{ fontSize: 18, lineHeight: "24px", fontWeight: 600, marginBottom: 8 }}>Phone number</h1>
      <p style={{ width: 362, color: "var(--label-secondary)" }}>
        Enter your phone number to verify your account.
        <br />
        Carrier rates may apply.
      </p>
      <div style={{ height: 36 }} />
      {/* display: contents keeps the form out of OnboardingCard's flex-column box model — its
         children (input, spacer, button) lay out exactly as if they were direct children — while
         still making Enter-to-submit work via the type="submit" Continue button below. */}
      <form
        style={{ display: "contents" }}
        onSubmit={(e) => {
          e.preventDefault();
          if (e164) setConfirming(true);
        }}
      >
        <div style={{ width: 324 }}>
          <TextInput
            leading={
              <CountryCodeSelect
                region={region}
                onChange={(r) => {
                  setRegion(r);
                  const match = r === "US" || r === "CA" ? "1" : code;
                  setCode(match);
                }}
              />
            }
            type="tel"
            inputMode="tel"
            placeholder="Phone number"
            autoFocus
            value={localNumber}
            onChange={(e) => setLocalNumber(sanitizeLocalNumber(code, e.target.value))}
          />
          {error && <p style={{ color: "var(--error)", fontSize: 13, marginTop: 8 }}>{error}</p>}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ alignSelf: "flex-end" }}>
          <Button type="submit" disabled={!e164 || pending}>
            {pending ? "Sending…" : "Continue"}
          </Button>
        </div>
      </form>
      {confirming && e164 && (
        <PhoneConfirmModal phoneNumber={e164} onEdit={() => setConfirming(false)} onConfirm={sendCode} />
      )}
    </OnboardingCard>
  );
}
