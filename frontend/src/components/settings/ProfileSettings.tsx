"use client";

import { useRef, useState } from "react";
import styles from "./ProfileSettings.module.css";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { TextInput } from "@/components/ui/TextInput";
import { mediaUrl } from "@/lib/api";
import { meApi } from "@/lib/endpoints";
import { useSession } from "@/store/session";
import { useToast } from "@/store/toast";

/** Settings -> Profile (reference/profile-editor.png): avatar, first/last name, about. Each field
 * saves on blur via the existing PATCH /me (only fields that changed are sent). */
export function ProfileSettings() {
  const me = useSession((s) => s.me);
  const setMe = useSession((s) => s.setMe);
  const [givenName, setGivenName] = useState(me?.given_name ?? "");
  const [familyName, setFamilyName] = useState(me?.family_name ?? "");
  const [about, setAbout] = useState(me?.about ?? "");
  const savedRef = useRef({ givenName: me?.given_name ?? "", familyName: me?.family_name ?? "", about: me?.about ?? "" });

  if (!me) return null;

  async function saveIfChanged() {
    const patch: { given_name?: string; family_name?: string | null; about?: string | null } = {};
    const trimmedGiven = givenName.trim();
    const trimmedFamily = familyName.trim();
    const trimmedAbout = about.trim();
    if (trimmedGiven && trimmedGiven !== savedRef.current.givenName) patch.given_name = trimmedGiven;
    if (trimmedFamily !== savedRef.current.familyName) patch.family_name = trimmedFamily || null;
    if (trimmedAbout !== savedRef.current.about) patch.about = trimmedAbout || null;
    if (Object.keys(patch).length === 0) return;
    const updated = await meApi.update(patch);
    setMe(updated);
    useToast.getState().show("Profile saved");
    savedRef.current = {
      givenName: updated.given_name,
      familyName: updated.family_name ?? "",
      about: updated.about ?? "",
    };
  }

  async function uploadPhoto(file: File) {
    const updated = await meApi.uploadAvatar(file);
    setMe(updated);
  }

  return (
    <div className={styles.pane}>
      <h2 className={styles.title}>Profile</h2>
      <AvatarPicker
        name={givenName || "?"}
        color={me.avatar_color}
        previewUrl={mediaUrl(me.avatar_url)}
        onPick={uploadPhoto}
        showAddPhotoButton
        buttonLabel="Edit photo"
      />
      <div className={styles.card}>
        <TextInput
          className={styles.row}
          placeholder="First name"
          value={givenName}
          onChange={(e) => setGivenName(e.target.value)}
          onBlur={saveIfChanged}
          maxLength={50}
        />
        <TextInput
          className={styles.row}
          placeholder="Last name"
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          onBlur={saveIfChanged}
          maxLength={50}
        />
        <TextInput
          className={styles.row}
          placeholder="About"
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          onBlur={saveIfChanged}
          maxLength={140}
        />
      </div>
      {/* icu:…--ProfileEntry--description (design-tokens.md §6), reused: same real Signal string. */}
      <p className={styles.hint}>Profiles are visible to people you message, contacts, and groups.</p>
    </div>
  );
}
