"use client";

import Link from "next/link";
import { Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrandSettings } from "./settings-types";
import { settingsTokens } from "./settings-tokens";
import { SettingsField, SettingsPanelHeader } from "./SettingsShared";

const COLOR_PRESETS = [
  { label: "Platform teal", value: "var(--graphite-primary)" },
  { label: "Twin blue", value: "var(--twin360-blue)" },
  { label: "Header white", value: "var(--graphite-text-header)" },
];

type Props = {
  orgName: string | null;
  canEdit: boolean;
  loading: boolean;
  busy: boolean;
  settings: BrandSettings;
  onChange: (settings: BrandSettings) => void;
  onSave: () => Promise<void>;
  onUploadAsset: (file: File, type: "logo" | "signature") => Promise<void>;
};

export function SettingsOrganizationPanel({
  orgName,
  canEdit,
  loading,
  busy,
  settings,
  onChange,
  onSave,
  onUploadAsset,
}: Props) {
  function update<K extends keyof BrandSettings>(key: K, value: BrandSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  if (!canEdit) {
    return (
      <section>
        <SettingsPanelHeader
          icon={Building2}
          eyebrow="Workspace"
          title="Organization"
          description="Organization branding and contact defaults for deliverables."
        />
        <p className="text-sm font-medium text-[var(--graphite-muted)]">
          {orgName ?? "Personal workspace"} — organization settings are managed by your workspace admin.
        </p>
      </section>
    );
  }

  return (
    <section>
      <SettingsPanelHeader
        icon={Building2}
        eyebrow="Workspace"
        title="Organization branding"
        description={`Defaults for ${orgName ?? "your workspace"} flow into Site Walk reports and client deliverables.`}
      />

      {loading ? (
        <p className="text-sm font-medium text-[var(--graphite-muted)]">Loading organization settings…</p>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave();
          }}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(160px,0.35fr)_1fr]">
            {settings.logo_url ? (
              <div className="rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,white_4%,var(--surface-zinc))] p-3">
                <p className={settingsTokens.sectionLabel}>Logo preview</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={settings.logo_url} alt="Company logo" className="mt-2 max-h-24 object-contain" />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--mobile-app-card-border)] p-6 text-sm font-medium text-[var(--graphite-muted)]">
                Upload a logo to preview branding.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsField label="Contact name">
                <input
                  className={settingsTokens.fieldInput}
                  value={settings.contact_name ?? ""}
                  onChange={(event) => update("contact_name", event.target.value)}
                />
              </SettingsField>
              <SettingsField label="Support email">
                <input
                  className={settingsTokens.fieldInput}
                  type="email"
                  value={settings.contact_email ?? ""}
                  onChange={(event) => update("contact_email", event.target.value)}
                />
              </SettingsField>
              <SettingsField label="Contact phone">
                <input
                  className={settingsTokens.fieldInput}
                  value={settings.contact_phone ?? ""}
                  onChange={(event) => update("contact_phone", event.target.value)}
                />
              </SettingsField>
              <SettingsField label="Website">
                <input
                  className={settingsTokens.fieldInput}
                  value={settings.website ?? ""}
                  onChange={(event) => update("website", event.target.value)}
                />
              </SettingsField>
            </div>
          </div>

          <SettingsField label="Business address">
            <textarea
              className={settingsTokens.textareaField}
              value={settings.address ?? ""}
              onChange={(event) => update("address", event.target.value)}
            />
          </SettingsField>

          <div>
            <p className={settingsTokens.sectionLabel}>Primary accent</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => {
                const active = settings.primary_color === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => update("primary_color", preset.value)}
                    className={cn(
                      settingsTokens.choiceButton,
                      "min-h-11 rounded-xl border px-3",
                      active
                        ? "border-[var(--accent-border-green)] bg-[color-mix(in_srgb,var(--graphite-primary)_12%,var(--graphite-canvas))]"
                        : "border-[var(--mobile-app-card-border)]",
                    )}
                  >
                    <span
                      className="mr-2 inline-block h-3 w-3 rounded-full"
                      style={{ background: preset.value }}
                      aria-hidden
                    />
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsField label="Company logo">
              <input
                className={settingsTokens.fieldInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onUploadAsset(file, "logo");
                  event.target.value = "";
                }}
              />
            </SettingsField>
            <SettingsField label="Signature image">
              <input
                className={settingsTokens.fieldInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onUploadAsset(file, "signature");
                  event.target.value = "";
                }}
              />
            </SettingsField>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-medium text-[var(--graphite-muted)]">
              Publish to refresh branding on reports and deliverables.
            </p>
            <button type="submit" className={settingsTokens.primaryButton} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Publish branding
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
