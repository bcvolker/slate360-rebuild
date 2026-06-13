"use client";

import { useCallback, useState } from "react";
import {
  BellRing,
  Building2,
  CreditCard,
  ShieldCheck,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountDeletionPanel } from "@/components/account/AccountDeletionPanel";
import { settingsTokens } from "./settings-tokens";
import type { SettingsSectionKey } from "./settings-types";
import { useAccountSettingsData } from "./useAccountSettingsData";
import { SettingsBillingPanel } from "./SettingsBillingPanel";
import { SettingsNotificationsPanel } from "./SettingsNotificationsPanel";
import { SettingsOrganizationPanel } from "./SettingsOrganizationPanel";
import { SettingsProfilePanel } from "./SettingsProfilePanel";
import { SettingsSecurityPanel } from "./SettingsSecurityPanel";
import { SettingsTeamPanel } from "./SettingsTeamPanel";
import { SettingsStatusBanner } from "./SettingsShared";

const SECTIONS: Array<{ key: SettingsSectionKey; label: string; icon: LucideIcon }> = [
  { key: "profile", label: "Profile", icon: UserRound },
  { key: "security", label: "Security", icon: ShieldCheck },
  { key: "notifications", label: "Notifications", icon: BellRing },
  { key: "organization", label: "Organization", icon: Building2 },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "team", label: "Team", icon: UsersRound },
];

export type AccountSettingsClientProps = {
  email: string;
  orgName: string | null;
  orgId: string | null;
  role: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
  isSlateCeo: boolean;
  canEditOrg: boolean;
};

export function AccountSettingsClient({
  email,
  orgName,
  orgId,
  role,
  userId,
  userName,
  avatarUrl,
  isAdmin,
  isSlateCeo,
  canEditOrg,
}: AccountSettingsClientProps) {
  const [activeSection, setActiveSection] = useState<SettingsSectionKey>("profile");
  const billingDisabledReason = !isAdmin
    ? "Billing is managed by your organization admin."
    : isSlateCeo
      ? "Internal owner billing is managed outside Stripe self-service."
      : undefined;

  const data = useAccountSettingsData({
    userId,
    initialName: userName,
    initialAvatarUrl: avatarUrl,
    orgId,
    canEditOrg,
  });

  const {
    loadTeam,
    loadOverview,
    statusMessage,
    loading,
    displayName,
    setDisplayName,
    jobTitle,
    setJobTitle,
    phone,
    setPhone,
    bio,
    setBio,
    location,
    setLocation,
    avatarUrl: profileAvatarUrl,
    photoBusy,
    fieldError,
    saveProfile,
    savePhoto,
    queueAutoSave,
    notificationFrequency,
    updateFrequency,
    prefs,
    updatePref,
    busy,
    brandSettings,
    setBrandSettings,
    brandLoading,
    brandBusy,
    saveBrandSettings,
    uploadBrandAsset,
    updatePassword,
    overview,
    overviewLoading,
    overviewError,
    teamOverview,
    teamLoading,
    teamError,
  } = data;

  const onInvite = useCallback(
    async (inviteEmail: string) => {
      const res = await fetch("/api/org/members/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Could not invite member");
      await loadTeam();
    },
    [loadTeam],
  );

  const visibleSections = SECTIONS.filter((section) => {
    if (section.key === "organization") return Boolean(orgId) && (canEditOrg || isSlateCeo);
    if (section.key === "team") return Boolean(orgId);
    return true;
  });

  return (
    <div className={settingsTokens.desktopGrid}>
      <nav className={settingsTokens.navCard} aria-label="Settings sections">
        <div className="mb-2 px-2 py-1.5">
          <p className={settingsTokens.eyebrow}>Account</p>
          <p className="mt-1 truncate text-sm font-bold text-[var(--graphite-text-header)]">
            {orgName ?? "Personal workspace"}
          </p>
          <p className="mt-0.5 truncate text-xs font-medium text-[var(--graphite-muted)]">{role}</p>
        </div>
        <div className="space-y-1">
          {visibleSections.map((section) => {
            const Icon = section.icon;
            const active = section.key === activeSection;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={cn(
                  settingsTokens.navButton,
                  active ? settingsTokens.navButtonActive : settingsTokens.navButtonIdle,
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {section.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="flex flex-col gap-3">
        <div className={settingsTokens.panelCard}>
          <SettingsStatusBanner message={statusMessage} />
          {activeSection === "profile" ? (
            <SettingsProfilePanel
              email={email}
              loading={loading}
              displayName={displayName}
              onDisplayNameChange={setDisplayName}
              jobTitle={jobTitle}
              onJobTitleChange={setJobTitle}
              phone={phone}
              onPhoneChange={setPhone}
              bio={bio}
              onBioChange={setBio}
              location={location}
              onLocationChange={setLocation}
              avatarUrl={profileAvatarUrl}
              photoBusy={photoBusy}
              fieldError={fieldError}
              onSaveProfile={saveProfile}
              onPhotoSelected={savePhoto}
              onFieldBlur={queueAutoSave}
            />
          ) : null}
          {activeSection === "security" ? (
            <SettingsSecurityPanel
              sessions={overview?.sessions ?? []}
              onUpdatePassword={updatePassword}
            />
          ) : null}
          {activeSection === "notifications" ? (
            <SettingsNotificationsPanel
              notificationFrequency={notificationFrequency}
              onNotificationFrequencyChange={updateFrequency}
              prefs={prefs}
              onPrefChange={updatePref}
              busy={busy}
            />
          ) : null}
          {activeSection === "organization" ? (
            <SettingsOrganizationPanel
              orgName={orgName}
              canEdit={Boolean(orgId) && canEditOrg}
              loading={brandLoading}
              busy={brandBusy}
              settings={brandSettings}
              onChange={setBrandSettings}
              onSave={saveBrandSettings}
              onUploadAsset={uploadBrandAsset}
            />
          ) : null}
          {activeSection === "billing" ? (
            <SettingsBillingPanel
              overview={overview}
              loading={overviewLoading}
              error={overviewError}
              billingDisabledReason={billingDisabledReason}
              isSlateCeo={isSlateCeo}
              onRefresh={loadOverview}
            />
          ) : null}
          {activeSection === "team" ? (
            <SettingsTeamPanel
              overview={teamOverview}
              loading={teamLoading}
              error={teamError}
              canInvite={isAdmin}
              isSlateCeo={isSlateCeo}
              onRefresh={loadTeam}
              onInvite={onInvite}
            />
          ) : null}
        </div>

        <AccountDeletionPanel isSlateCeo={isSlateCeo} />
      </div>
    </div>
  );
}
