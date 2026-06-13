"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Box, FolderOpen, MapPin } from "lucide-react";
import type {
  DashboardHomeCounts,
  DashboardRecentProject,
  DashboardRecentTwin,
  DashboardRecentWalk,
} from "@/lib/dashboard/load-dashboard-home-data";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { DashboardProjectsRail } from "./DashboardProjectsRail";
import { dashboardDesktopTokens as t } from "./dashboard-tokens";

type DashboardHomeContentProps = {
  counts: DashboardHomeCounts;
  recentProjects: DashboardRecentProject[];
  recentWalks: DashboardRecentWalk[];
  recentTwins: DashboardRecentTwin[];
};

type Tab = "overview" | "activity";
type Featured = { kind: "project" | "twin"; name: string; status: string; date: string; href: string; imageUrl?: string | null };

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DashboardHomeContent({ counts, recentProjects, recentWalks, recentTwins }: DashboardHomeContentProps) {
  const [tab, setTab] = useState<Tab>("overview");

  const latestProject = recentProjects[0] ?? null;
  const latestTwin = recentTwins[0] ?? null;
  const twinIsNewer =
    latestTwin && (!latestProject || new Date(latestTwin.updatedAt) > new Date(latestProject.createdAt));
  const featured: Featured | null = twinIsNewer
    ? { kind: "twin", name: latestTwin!.title, status: latestTwin!.status, date: latestTwin!.updatedAt, href: `/digital-twin/twins/${latestTwin!.id}`, imageUrl: latestTwin!.imageUrl }
    : latestProject
      ? { kind: "project", name: latestProject.name, status: latestProject.status, date: latestProject.createdAt, href: `/projects/${latestProject.id}`, imageUrl: latestProject.imageUrl }
      : null;
  // Keep the featured project out of the rail to avoid redundancy.
  const railProjects = featured?.kind === "project" ? recentProjects.slice(1) : recentProjects;

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
              href={featured.href}
              className="group relative h-44 shrink-0 overflow-hidden rounded-2xl border border-[var(--mobile-app-card-border)] shadow-[var(--mobile-app-card-shadow)] transition-all hover:border-[color-mix(in_srgb,var(--graphite-primary)_42%,transparent)]"
            >
              {featured.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featured.imageUrl} alt={featured.name} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    background:
                      "radial-gradient(120% 120% at 25% 15%, color-mix(in_srgb,var(--graphite-primary) 30%, var(--graphite-canvas)) 0%, var(--graphite-canvas) 70%)",
                  }}
                >
                  {featured.kind === "twin" ? (
                    <Box className="h-16 w-16 text-[color-mix(in_srgb,var(--graphite-primary)_55%,transparent)]" strokeWidth={1} />
                  ) : (
                    <FolderOpen className="h-16 w-16 text-[color-mix(in_srgb,var(--graphite-primary)_55%,transparent)]" strokeWidth={1} />
                  )}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-y-0 left-0 flex max-w-lg flex-col justify-end p-5">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--graphite-primary)_85%,white)]">
                  {featured.kind === "twin" ? "Continue — Digital Twin" : "Continue where you left off"}
                </p>
                <p className="mt-1 truncate text-2xl font-extrabold text-white">{featured.name}</p>
                <p className="mt-1 text-sm text-white/70">{featured.status} · {formatDate(featured.date)}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                  {featured.kind === "twin" ? "Open twin" : "Open project"}{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
