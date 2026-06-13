import Link from "next/link";
import { ArrowRight, Camera } from "lucide-react";
import type {
  DashboardHomeCounts,
  DashboardRecentProject,
  DashboardRecentWalk,
} from "@/lib/dashboard/load-dashboard-home-data";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { DashboardProjectsRail } from "./DashboardProjectsRail";
import { dashboardDesktopTokens as t } from "./dashboard-tokens";

type DashboardHomeContentProps = {
  workspaceName: string;
  counts: DashboardHomeCounts;
  recentProjects: DashboardRecentProject[];
  recentWalks: DashboardRecentWalk[];
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DashboardHomeContent({
  workspaceName,
  counts,
  recentProjects,
  recentWalks,
}: DashboardHomeContentProps) {
  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-3">
      {/* Hero */}
      <section
        className="relative shrink-0 overflow-hidden rounded-2xl border border-[var(--mobile-app-card-border)] px-6 py-5 shadow-[var(--mobile-app-card-shadow)]"
        style={{
          background:
            "radial-gradient(120% 140% at 0% 0%, color-mix(in_srgb,var(--graphite-primary) 22%, var(--graphite-canvas)) 0%, var(--graphite-canvas) 55%)",
        }}
      >
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--graphite-primary)]">
          {workspaceName}
        </p>
        <h2 className="mt-1 max-w-xl text-2xl font-extrabold tracking-tight text-[var(--graphite-text-header)] sm:text-3xl">
          Capture the site. Keep the twin.
        </h2>
        <p className="mt-2 max-w-lg text-sm text-[var(--graphite-muted)]">
          {counts.projects} project{counts.projects === 1 ? "" : "s"} · {counts.siteWalks} site walk
          {counts.siteWalks === 1 ? "" : "s"} · {counts.digitalTwins} twin{counts.digitalTwins === 1 ? "" : "s"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/site-walk"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--graphite-primary)] px-4 py-2 text-sm font-semibold text-[var(--graphite-canvas)] transition-transform active:scale-[0.99]"
          >
            <Camera className="h-4 w-4" /> Start a Site Walk
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--mobile-app-card-border)] px-4 py-2 text-sm font-semibold text-[var(--graphite-text-body)] transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_42%,transparent)]"
          >
            Manage projects <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Projects scroller (open / rename / delete) */}
      <DashboardProjectsRail projects={recentProjects} total={counts.projects} />

      {/* Compact recent activity */}
      <section className="min-h-0 flex-1">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className={t.sectionLabel}>Recent Site Walks{counts.siteWalks ? ` · ${counts.siteWalks}` : ""}</h2>
          <Link href="/site-walks" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--graphite-primary)] hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recentWalks.length === 0 ? (
          <DashboardEmptyState
            title="No site walks yet"
            description="Start a walk from Site Walk on mobile, or open the walks list when sessions exist."
            actionLabel="Browse walks"
            actionHref="/site-walks"
          />
        ) : (
          <ul className="space-y-2">
            {recentWalks.slice(0, 4).map((walk) => (
              <li key={walk.id}>
                <Link href={`/site-walk/walks/${walk.id}`} className={t.listRow}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[var(--graphite-text-header)]">{walk.title}</span>
                    <span className="block truncate text-xs text-[var(--graphite-muted)]">{walk.status} · {formatDate(walk.updatedAt)}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
