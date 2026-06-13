"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, FolderOpen, MapPin } from "lucide-react";
import type {
  DashboardHomeCounts,
  DashboardRecentProject,
  DashboardRecentWalk,
} from "@/lib/dashboard/load-dashboard-home-data";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { DashboardProjectsRail } from "./DashboardProjectsRail";
import { dashboardDesktopTokens as t } from "./dashboard-tokens";

type DashboardHomeContentProps = {
  counts: DashboardHomeCounts;
  recentProjects: DashboardRecentProject[];
  recentWalks: DashboardRecentWalk[];
};

type Tab = "overview" | "activity";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DashboardHomeContent({ counts, recentProjects, recentWalks }: DashboardHomeContentProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const featured = recentProjects[0] ?? null;
  const railProjects = recentProjects.slice(featured ? 1 : 0);

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-3">
      {/* Dashboard tabs */}
      <nav className="flex shrink-0 items-center gap-1" aria-label="Dashboard pages">
        {([
          { id: "overview", label: "Overview" },
          { id: "activity", label: "Activity" },
        ] as const).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setTab(p.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === p.id
                ? "bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-text-header)]"
                : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {/* Featured: most recent project (continue where you left off) */}
          {featured ? (
            <Link
              href={`/projects/${featured.id}`}
              className={`${t.cardInteractive} group grid shrink-0 grid-cols-[200px_minmax(0,1fr)] gap-4 overflow-hidden p-0`}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  background:
                    "radial-gradient(120% 120% at 30% 20%, color-mix(in_srgb,var(--graphite-primary) 30%, var(--graphite-canvas)) 0%, var(--graphite-canvas) 70%)",
                }}
              >
                <FolderOpen className="h-12 w-12 text-[color-mix(in_srgb,var(--graphite-primary)_70%,transparent)]" strokeWidth={1.25} />
              </div>
              <div className="min-w-0 py-5 pr-5">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--graphite-primary)]">
                  Continue where you left off
                </p>
                <p className="mt-1 truncate text-xl font-bold text-[var(--graphite-text-header)]">{featured.name}</p>
                <p className="mt-1 text-sm text-[var(--graphite-muted)]">
                  {featured.status} · {formatDate(featured.createdAt)}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--graphite-primary)]">
                  Open project <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ) : (
            <DashboardEmptyState
              title="No projects yet"
              description="Create a project to organize walks, twins, files, and field activity."
              actionLabel="Create a project"
              actionHref="/projects"
            />
          )}

          {/* Horizontal projects scroller */}
          <DashboardProjectsRail projects={railProjects} total={counts.projects} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
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
            <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
              {recentWalks.map((walk) => (
                <Link
                  key={walk.id}
                  href={`/site-walk/walks/${walk.id}`}
                  className={`${t.cardInteractive} flex w-56 shrink-0 snap-start flex-col gap-2 p-4`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-primary)]">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <span className="truncate text-sm font-semibold text-[var(--graphite-text-header)]">{walk.title}</span>
                  <span className="truncate text-xs text-[var(--graphite-muted)]">{walk.status} · {formatDate(walk.updatedAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
