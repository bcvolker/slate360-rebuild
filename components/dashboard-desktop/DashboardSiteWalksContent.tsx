import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HubWalk } from "@/lib/types/site-walk";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { dashboardDesktopTokens as t } from "./dashboard-tokens";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DashboardSiteWalksContent({ walks }: { walks: HubWalk[] }) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header>
        <h1 className={t.pageTitle}>Site Walks</h1>
        <p className={t.pageSubtitle}>{walks.length.toLocaleString()} walk sessions in this workspace.</p>
      </header>

      {walks.length === 0 ? (
        <DashboardEmptyState
          title="No site walks yet"
          description="Walk sessions appear here after field capture. Open Site Walk on a mobile device to start."
          actionLabel="Open Site Walk"
          actionHref="/site-walk"
        />
      ) : (
        <ul className="space-y-2">
          {walks.map((walk) => (
            <li key={walk.id}>
              <Link href={`/site-walk/walks/${walk.id}`} className={t.listRow}>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--graphite-text-header)]">
                    {walk.title}
                  </span>
                  <span className="block truncate text-xs text-[var(--graphite-muted)]">
                    {walk.status}
                    {walk.projectName ? ` · ${walk.projectName}` : ""} · {formatDate(walk.updatedAt)}
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
