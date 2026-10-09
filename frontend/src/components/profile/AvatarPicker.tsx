"use client";

import { Camera } from "lucide-react";
import { useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import styles from "./AvatarPicker.module.css";

interface Props {
  name: string;
  color: string;
  previewUrl: string | null; // an object URL for the picked file, or an existing avatar
  onPick: (file: File) => void;
  /** Shows the "Add photo" pill below the circle, like the registration screen (§7.1). */
  showAddPhotoButton?: boolean;
}

/**
 * Signal has a preset-color/crop editor here (deviation, logged in DECISIONS.md);
 * we use a plain file picker, which is what the spec's "mocked" scope calls for.
 */
export function AvatarPicker({ name, color, previewUrl, onPick, showAddPhotoButton }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const open = () => fileInput.current?.click();

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.circle} onClick={open} aria-label="Edit photo">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className={styles.image} />
        ) : (
          <Avatar name={name} color={color} url={null} size={80} />
        )}
        <span className={styles.badge}>
          <Camera size={16} aria-hidden />
        </span>
      </button>
      {showAddPhotoButton && (
        <button type="button" className={styles.addPhoto} onClick={open}>
          Add photo
        </button>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
        }}
      />
    </div>
  );
}
