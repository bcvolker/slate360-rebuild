import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HubTwin } from "@/lib/types/digital-twin-hub";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { dashboardDesktopTokens as t } from "./dashboard-tokens";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DashboardTwinsContent({ twins }: { twins: HubTwin[] }) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header>
        <h1 className={t.pageTitle}>Digital Twins</h1>
        <p className={t.pageSubtitle}>{twins.length.toLocaleString()} twin spaces in this workspace.</p>
      </header>

      {twins.length === 0 ? (
        <DashboardEmptyState
          title="No digital twins yet"
          description="Twin spaces appear here after capture and processing. Use the Digital Twin app to create your first space."
          actionLabel="Open Digital Twin"
          actionHref="/digital-twin"
        />
      ) : (
        <ul className="space-y-2">
          {twins.map((twin) => (
            <li key={twin.id}>
              <Link href={`/digital-twin/twins/${twin.id}`} className={t.listRow}>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--graphite-text-header)]">
                    {twin.title}
                  </span>
                  <span className="block truncate text-xs text-[var(--graphite-muted)]">
                    {twin.statusChip ?? twin.status}
                    {twin.projectName ? ` · ${twin.projectName}` : ""} · {formatDate(twin.updatedAt)}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
