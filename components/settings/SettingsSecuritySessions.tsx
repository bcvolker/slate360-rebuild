"use client";

import type { DashboardAccountOverview } from "@/lib/types/dashboard";
import { MonitorSmartphone } from "lucide-react";
import { settingsTokens } from "./settings-tokens";

type Props = {
  sessions: DashboardAccountOverview["sessions"];
};

function formatLastSeen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SettingsSecuritySessions({ sessions }: Props) {
  return (
    <section className="mt-6 border-t border-[var(--mobile-app-card-border)] pt-6">
      <div className="mb-4 flex items-start gap-3">
        <span className={settingsTokens.iconChip} aria-hidden>
          <MonitorSmartphone className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <div>
          <p className={settingsTokens.eyebrow}>Sessions</p>
          <h3 className="text-lg font-bold text-[var(--graphite-text-header)]">Active devices</h3>
          <p className={settingsTokens.subtitle}>Recent sign-ins recorded for this account.</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm font-medium text-[var(--graphite-muted)]">No recent sessions recorded.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,white_4%,var(--surface-zinc))] px-3 py-3"
            >
              <p className="text-sm font-semibold text-[var(--graphite-text-header)]">{session.device}</p>
              <p className="mt-0.5 text-xs font-medium text-[var(--graphite-muted)]">
                {session.ip} · Last seen {formatLastSeen(session.lastActive)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
