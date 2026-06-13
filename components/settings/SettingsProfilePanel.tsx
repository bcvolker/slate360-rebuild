"use client";

import { useRef } from "react";
import { Camera, Loader2, UserRound } from "lucide-react";
import { settingsTokens } from "./settings-tokens";
import { SettingsField, SettingsPanelHeader, SettingsPanelSkeleton } from "./SettingsShared";

type Props = {
  email: string;
  loading: boolean;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  jobTitle: string;
  onJobTitleChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  bio: string;
  onBioChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
  avatarUrl: string;
  photoBusy: boolean;
  fieldError: string | null;
  onSaveProfile: () => Promise<void>;
  onPhotoSelected: (file: File) => Promise<void>;
  onFieldBlur: () => void;
};

export function SettingsProfilePanel({
  email,
  loading,
  displayName,
  onDisplayNameChange,
  jobTitle,
  onJobTitleChange,
  phone,
  onPhoneChange,
  bio,
  onBioChange,
  location,
  onLocationChange,
  avatarUrl,
  photoBusy,
  fieldError,
  onSaveProfile,
  onPhotoSelected,
  onFieldBlur,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const initial = displayName.trim().charAt(0).toUpperCase() || email.charAt(0).toUpperCase() || "U";

  if (loading) {
    return (
      <section>
        <SettingsPanelHeader
          icon={UserRound}
          eyebrow="Identity"
          title="Profile"
          description="Update your display name, contact details, and profile photo."
        />
        <SettingsPanelSkeleton rows={4} />
      </section>
    );
  }

  return (
    <section>
      <SettingsPanelHeader
        icon={UserRound}
        eyebrow="Identity"
        title="Profile"
        description="Text fields auto-save on blur. Use Save changes after updating your photo."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(140px,0.35fr)_1fr] lg:items-start">
        <div className="flex flex-col items-start gap-2">
          <div className={settingsTokens.avatarFrame}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden>{initial}</span>
            )}
            {photoBusy ? (
              <span className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)]">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--graphite-primary)]" />
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className={settingsTokens.ghostButton}
            onClick={() => fileRef.current?.click()}
            disabled={photoBusy}
          >
            <Camera className="h-4 w-4" />
            Save photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onPhotoSelected(file);
              event.target.value = "";
            }}
          />
        </div>

        <div className="grid min-w-0 gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsField label="Display name">
              <input
                className={settingsTokens.fieldInput}
                value={displayName}
                onChange={(event) => onDisplayNameChange(event.target.value)}
                onBlur={onFieldBlur}
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </SettingsField>
            <SettingsField label="Job title">
              <input
                className={settingsTokens.fieldInput}
                value={jobTitle}
                onChange={(event) => onJobTitleChange(event.target.value)}
                onBlur={onFieldBlur}
                placeholder="Project manager"
                autoComplete="organization-title"
              />
            </SettingsField>
            <SettingsField label="Account email" hint="Contact support@slate360.ai to change your login email.">
              <input className={settingsTokens.fieldInput} value={email} readOnly disabled />
            </SettingsField>
            <SettingsField label="Phone">
              <input
                className={settingsTokens.fieldInput}
                value={phone}
                onChange={(event) => onPhoneChange(event.target.value)}
                onBlur={onFieldBlur}
                placeholder="Optional"
                autoComplete="tel"
                inputMode="tel"
              />
            </SettingsField>
          </div>
          <SettingsField label="Bio">
            <textarea
              className={settingsTokens.textareaField}
              value={bio}
              onChange={(event) => onBioChange(event.target.value)}
              onBlur={onFieldBlur}
              placeholder="Short summary for reports and team context."
            />
          </SettingsField>
          <SettingsField label="Location">
            <input
              className={settingsTokens.fieldInput}
              value={location}
              onChange={(event) => onLocationChange(event.target.value)}
              onBlur={onFieldBlur}
              placeholder="City, state"
              autoComplete="address-level2"
            />
          </SettingsField>
          {fieldError ? <p className={settingsTokens.statusError}>{fieldError}</p> : null}
          <div className="flex justify-end">
            <button type="button" className={settingsTokens.primaryButton} onClick={() => void onSaveProfile()}>
              Save changes
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
