"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Box, FolderOpen } from "lucide-react";
import type {
  DashboardHomeCounts,
  DashboardNeedsAttentionItem,
  DashboardRecentProject,
  DashboardRecentTwin,
  DashboardRecentWalk,
} from "@/lib/dashboard/load-dashboard-home-data";
import { formatDashboardDate } from "@/lib/dashboard/format-dashboard-date";
import CustomizableWidgetBoard, { type BoardWidget } from "./CustomizableWidgetBoard";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { DashboardLibraryWidget, type LibraryTabId } from "./DashboardLibraryWidget";
import { DashboardNeedsAttentionWidget } from "./DashboardNeedsAttentionWidget";
import { QuickMetricsStrip, type QuickMetricChip } from "./QuickMetricsStrip";
import { dashboardDesktopTokens as t } from "./dashboard-tokens";

type DashboardHomeContentProps = {
  counts: DashboardHomeCounts;
  recentProjects: DashboardRecentProject[];
  recentWalks: DashboardRecentWalk[];
  recentTwins: DashboardRecentTwin[];
  needsAttention: DashboardNeedsAttentionItem[];
};

function focusWidget(id: string) {
  document.getElementById(`dashboard-widget-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

export function DashboardHomeContent({
  counts,
  recentProjects,
  recentWalks,
  recentTwins,
  needsAttention,
}: DashboardHomeContentProps) {
  const [libraryTab, setLibraryTab] = useState<LibraryTabId>("projects");

  const latestProject = recentProjects[0] ?? null;
  const latestTwin = recentTwins[0] ?? null;
  const twinIsNewer =
    latestTwin && (!latestProject || new Date(latestTwin.updatedAt) > new Date(latestProject.createdAt));
  const featured = twinIsNewer
    ? { kind: "twin" as const, name: latestTwin!.title, status: latestTwin!.status, date: latestTwin!.updatedAt, href: `/digital-twin/twins/${latestTwin!.id}`, imageUrl: latestTwin!.imageUrl }
    : latestProject
      ? { kind: "project" as const, name: latestProject.name, status: latestProject.status, date: latestProject.createdAt, href: `/projects/${latestProject.id}`, imageUrl: latestProject.imageUrl }
      : null;

  const railProjects = featured?.kind === "project" ? recentProjects.slice(1) : recentProjects;

  const focusLibraryTab = (tab: LibraryTabId) => {
    setLibraryTab(tab);
    focusWidget("library");
  };

  const chips = useMemo<QuickMetricChip[]>(() => {
    const out: QuickMetricChip[] = [];
    if (needsAttention.length > 0) {
      out.push({ id: "needs-attention", label: `${needsAttention.length} need attention`, onClick: () => focusWidget("needs-attention") });
    }
    if (counts.walksInProgress > 0) {
      out.push({ id: "walks-in-progress", label: `${counts.walksInProgress} walk${counts.walksInProgress === 1 ? "" : "s"} in progress`, onClick: () => focusLibraryTab("walks") });
    }
    if (counts.twinsDraft > 0) {
      out.push({ id: "twins-draft", label: `${counts.twinsDraft} draft twin${counts.twinsDraft === 1 ? "" : "s"}`, onClick: () => focusLibraryTab("twins") });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAttention.length, counts.walksInProgress, counts.twinsDraft]);

  const widgets = useMemo<BoardWidget[]>(() => [
    {
      id: "featured",
      title: featured?.kind === "twin" ? "Continue — Twin 360" : "Continue where you left off",
      defaultSpan: 6,
      render: () =>
        featured ? (
          <Link
            href={featured.href}
            className="group relative block h-full min-h-[220px] overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)]"
          >
            {featured.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={featured.imageUrl} alt={featured.name} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: "radial-gradient(120% 120% at 25% 15%, color-mix(in srgb, var(--graphite-primary) 30%, var(--graphite-canvas)) 0%, var(--graphite-canvas) 70%)" }}
              >
                {featured.kind === "twin" ? (
                  <Box className="h-16 w-16 text-[color-mix(in_srgb,var(--graphite-primary)_55%,transparent)]" strokeWidth={1} />
                ) : (
                  <FolderOpen className="h-16 w-16 text-[color-mix(in_srgb,var(--graphite-primary)_55%,transparent)]" strokeWidth={1} />
                )}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end p-5">
              <p className="truncate text-2xl font-extrabold text-white">{featured.name}</p>
              <p className="mt-1 text-sm text-white/70">{featured.status} · {formatDashboardDate(featured.date)}</p>
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
        ),
    },
    {
      id: "needs-attention",
      title: `Needs Attention${needsAttention.length ? ` · ${needsAttention.length}` : ""}`,
      defaultSpan: 6,
      render: () => <DashboardNeedsAttentionWidget items={needsAttention} />,
    },
    {
      id: "library",
      title: "Library",
      defaultSpan: 12,
      render: () => (
        <DashboardLibraryWidget
          activeTab={libraryTab}
          onTabChange={setLibraryTab}
          projects={railProjects}
          walks={recentWalks}
          twins={recentTwins}
          walksInProgress={counts.walksInProgress}
          twinsDraft={counts.twinsDraft}
        />
      ),
    },
  ], [counts, featured, libraryTab, needsAttention, railProjects, recentTwins, recentWalks]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <h1 className={t.pageTitle}>Dashboard</h1>
      </div>
      <QuickMetricsStrip chips={chips} />
      <div className="min-h-0 flex-1">
        <CustomizableWidgetBoard boardId="dashboard-home-v2" widgets={widgets} />
      </div>
    </div>
  );
}
