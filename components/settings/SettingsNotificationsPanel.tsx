"use client";

import { BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { settingsTokens } from "./settings-tokens";
import type { NotificationFrequency, NotificationPrefs } from "./settings-types";
import { SettingsPanelHeader } from "./SettingsShared";

const FREQUENCY_OPTIONS: Array<{ value: NotificationFrequency; label: string }> = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily digest" },
  { value: "weekly", label: "Weekly digest" },
];

const TOGGLE_ITEMS: Array<{
  key: keyof NotificationPrefs;
  label: string;
  detail: string;
}> = [
  { key: "projectUpdates", label: "Project updates", detail: "Status changes and milestones." },
  { key: "walkAssignments", label: "Walk assignments", detail: "When you are assigned a Site Walk." },
  { key: "deliverableReady", label: "Deliverable ready", detail: "When a report or export is ready." },
  { key: "teamActivity", label: "Team activity", detail: "Collaborator actions in your workspace." },
  { key: "billingAlerts", label: "Billing alerts", detail: "Invoices, renewals, and credit balance." },
  { key: "systemMaintenance", label: "System maintenance", detail: "Planned downtime and platform notices." },
];

type Props = {
  notificationFrequency: NotificationFrequency;
  onNotificationFrequencyChange: (value: NotificationFrequency) => void;
  prefs: NotificationPrefs;
  onPrefChange: (key: keyof NotificationPrefs, value: boolean) => void;
  busy: boolean;
};

export function SettingsNotificationsPanel({
  notificationFrequency,
  onNotificationFrequencyChange,
  prefs,
  onPrefChange,
  busy,
}: Props) {
  const hasCategories = TOGGLE_ITEMS.some((item) => typeof prefs[item.key] === "boolean");

  return (
    <section>
      <SettingsPanelHeader
        icon={BellRing}
        eyebrow="Alerts"
        title="Notifications"
        description="Preferences auto-save when you change a toggle."
      />

      {!hasCategories ? (
        <p className="text-sm font-medium text-[var(--graphite-muted)]">No notification categories yet.</p>
      ) : null}

      <div className="grid gap-5">
        <div>
          <p className={settingsTokens.sectionLabel}>Email frequency</p>
          <div className={cn(settingsTokens.choiceGroup, "mt-2")}>
            {FREQUENCY_OPTIONS.map((option) => {
              const active = notificationFrequency === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={busy}
                  onClick={() => onNotificationFrequencyChange(option.value)}
                  className={cn(
                    settingsTokens.choiceButton,
                    active ? settingsTokens.choiceButtonActive : settingsTokens.choiceButtonIdle,
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2">
          {TOGGLE_ITEMS.map((item) => (
            <label key={item.key} className={settingsTokens.toggleRow}>
              <span>
                <span className="block text-sm font-semibold text-[var(--graphite-text-header)]">
                  {item.label}
                </span>
                <span className="mt-0.5 block text-xs font-medium text-[var(--graphite-muted)]">
                  {item.detail}
                </span>
              </span>
              <input
                type="checkbox"
                checked={prefs[item.key]}
                disabled={busy}
                onChange={(event) => onPrefChange(item.key, event.target.checked)}
                className="h-5 w-5 accent-[var(--graphite-primary)]"
              />
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
