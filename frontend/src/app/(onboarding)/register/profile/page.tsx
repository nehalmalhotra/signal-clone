"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { OnboardingCard } from "@/components/onboarding/OnboardingCard";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { ApiError } from "@/lib/api";
import { authApi, meApi } from "@/lib/endpoints";
import { useOnboarding } from "@/store/onboarding";
import { useSession } from "@/store/session";

export default function ProfileEntryPage() {
  const router = useRouter();
  const { phoneNumber, code } = useOnboarding();
  const startSession = useSession((s) => s.startSession);
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A refresh loses the in-memory code; the number must be re-verified.
  useEffect(() => {
    if (!phoneNumber || !code) router.replace("/register");
  }, [phoneNumber, code, router]);

  function pickPhoto(file: File) {
    setPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function submit() {
    if (!phoneNumber || !code || !givenName.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      // The account has to exist before an avatar can be attached to it (plan §1 step 3).
      const session = await authApi.register({
        phone_number: phoneNumber,
        code,
        given_name: givenName.trim(),
        family_name: familyName.trim() || null,
      });
      startSession(session.token, session.user);
      if (photo) {
        const withAvatar = await meApi.uploadAvatar(photo);
        startSession(session.token, withAvatar);
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (!phoneNumber || !code) return null;

  return (
    <OnboardingCard>
      <div style={{ height: 24 }} />
      <h1 style={{ fontSize: 18, lineHeight: "24px", fontWeight: 600, marginBottom: 8 }}>Set up your profile</h1>
      <p style={{ width: 362, color: "var(--label-secondary)" }}>
        Profiles are visible to people you message, contacts, and groups.
      </p>
      <div style={{ height: 28 }} />
      <AvatarPicker
        name={givenName || "?"}
        color="A100"
        previewUrl={previewUrl}
        onPick={pickPhoto}
        showAddPhotoButton
      />
      <div style={{ height: 28 }} />
      {/* display: contents: see the phone step for why — keeps the form out of OnboardingCard's
         flex-column box model while still making Enter submit via the type="submit" button. */}
      <form
        style={{ display: "contents" }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div style={{ width: 400, display: "flex", flexDirection: "column", gap: 12 }}>
          <TextInput
            placeholder="First name (required)"
            value={givenName}
            onChange={(e) => setGivenName(e.target.value)}
            maxLength={50}
            autoFocus
          />
          <TextInput
            placeholder="Last name (optional)"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            maxLength={50}
          />
        </div>
        {error && <p style={{ color: "var(--error)", fontSize: 13, marginTop: 12 }}>{error}</p>}
        <div style={{ flex: 1 }} />
        <div style={{ alignSelf: "flex-end" }}>
          <Button type="submit" disabled={!givenName.trim() || pending}>
            {pending ? "Saving…" : "Continue"}
          </Button>
        </div>
      </form>
    </OnboardingCard>
  );
}
