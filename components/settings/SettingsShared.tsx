"use client";

import type { LucideIcon } from "lucide-react";
import { settingsTokens } from "./settings-tokens";

type SettingsPanelHeaderProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string;
};

export function SettingsPanelHeader({ icon: Icon, eyebrow, title, description }: SettingsPanelHeaderProps) {
  return (
    <header className="mb-5 flex items-start gap-3">
      <span className={settingsTokens.iconChip} aria-hidden>
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className={settingsTokens.eyebrow}>{eyebrow}</p>
        <h2 className={settingsTokens.title}>{title}</h2>
        {description ? <p className={settingsTokens.subtitle}>{description}</p> : null}
      </div>
    </header>
  );
}

export function SettingsField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className={settingsTokens.sectionLabel}>{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1.5 text-xs font-medium text-[var(--graphite-muted)]">{hint}</p> : null}
    </label>
  );
}

export function SettingsStatusBanner({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return (
    <p className={message.ok ? settingsTokens.statusOk : settingsTokens.statusError} role="status">
      {message.text}
    </p>
  );
}

export function SettingsMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className={settingsTokens.metricTile}>
      <p className={settingsTokens.metricLabel}>{label}</p>
      <p className={settingsTokens.metricValue}>{value}</p>
    </div>
  );
}

export function SettingsPanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={`${settingsTokens.skeletonBlock} h-11`} />
      ))}
    </div>
  );
}
