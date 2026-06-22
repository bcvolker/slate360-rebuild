"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Box, Boxes, FolderOpen, MapPin } from "lucide-react";
import type {
  DashboardHomeCounts,
  DashboardRecentProject,
  DashboardRecentTwin,
  DashboardRecentWalk,
} from "@/lib/dashboard/load-dashboard-home-data";
import CustomizableWidgetBoard, { type BoardWidget } from "./CustomizableWidgetBoard";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { dashboardDesktopTokens as t } from "./dashboard-tokens";

type DashboardHomeContentProps = {
  counts: DashboardHomeCounts;
  recentProjects: DashboardRecentProject[];
  recentWalks: DashboardRecentWalk[];
  recentTwins: DashboardRecentTwin[];
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function RowLink({ href, icon: Icon, title, meta }: { href: string; icon: typeof MapPin; title: string; meta: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_42%,transparent)]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-primary)]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--graphite-text-header)]">{title}</span>
        <span className="block truncate text-xs text-[var(--graphite-muted)]">{meta}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
    </Link>
  );
}

export function DashboardHomeContent({ counts, recentProjects, recentWalks, recentTwins }: DashboardHomeContentProps) {
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

  const widgets = useMemo<BoardWidget[]>(() => [
    {
      id: "featured",
      title: featured?.kind === "twin" ? "Continue — Digital Twin" : "Continue where you left off",
      defaultSpan: 8,
      render: () =>
        featured ? (
          <Link
            href={featured.href}
            className="group relative block h-40 overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)]"
          >
            {featured.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={featured.imageUrl} alt={featured.name} className="absolute inset-0 h-full w-full object-cover" />
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
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            <div className="absolute inset-y-0 left-0 flex max-w-lg flex-col justify-end p-5">
              <p className="truncate text-2xl font-extrabold text-white">{featured.name}</p>
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
        ),
    },
    {
      id: "at-a-glance",
      title: "At a glance",
      defaultSpan: 4,
      render: () => (
        <div className="grid grid-cols-3 gap-2">
          {([
            { label: "Projects", value: counts.projects, href: "/projects" },
            { label: "Site Walks", value: counts.siteWalks, href: "/site-walks" },
            { label: "Twins", value: counts.digitalTwins, href: "/digital-twins" },
          ] as const).map((s) => (
            <Link key={s.label} href={s.href} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_42%,transparent)]">
              <span className="block text-2xl font-extrabold text-[var(--graphite-text-header)]">{s.value}</span>
              <span className="mt-0.5 block text-xs text-[var(--graphite-muted)]">{s.label}</span>
            </Link>
          ))}
        </div>
      ),
    },
    {
      id: "projects",
      title: `Recent Projects${counts.projects ? ` · ${counts.projects}` : ""}`,
      defaultSpan: 4,
      render: () =>
        railProjects.length === 0 ? (
          <DashboardEmptyState title="No projects" description="Create a project to get started." actionLabel="New project" actionHref="/projects" />
        ) : (
          <div className="flex flex-col gap-2">
            {railProjects.slice(0, 8).map((p) => (
              <RowLink key={p.id} href={`/projects/${p.id}`} icon={FolderOpen} title={p.name} meta={`${p.status} · ${formatDate(p.createdAt)}`} />
            ))}
          </div>
        ),
    },
    {
      id: "walks",
      title: `Recent Site Walks${counts.siteWalks ? ` · ${counts.siteWalks}` : ""}`,
      defaultSpan: 4,
      render: () =>
        recentWalks.length === 0 ? (
          <DashboardEmptyState title="No site walks yet" description="Start a walk from Site Walk on mobile." actionLabel="Browse walks" actionHref="/site-walks" />
        ) : (
          <div className="flex flex-col gap-2">
            {recentWalks.slice(0, 8).map((w) => (
              <RowLink key={w.id} href={`/site-walk/walks/${w.id}`} icon={MapPin} title={w.title} meta={`${w.status} · ${formatDate(w.updatedAt)}`} />
            ))}
          </div>
        ),
    },
    {
      id: "twins",
      title: `Digital Twins${counts.digitalTwins ? ` · ${counts.digitalTwins}` : ""}`,
      defaultSpan: 4,
      render: () =>
        recentTwins.length === 0 ? (
          <DashboardEmptyState title="No digital twins yet" description="Capture a space to build a twin." actionLabel="Open Twins" actionHref="/digital-twins" />
        ) : (
          <div className="flex flex-col gap-2">
            {recentTwins.slice(0, 8).map((tw) => (
              <RowLink key={tw.id} href={`/digital-twin/twins/${tw.id}`} icon={Boxes} title={tw.title} meta={`${tw.status} · ${formatDate(tw.updatedAt)}`} />
            ))}
          </div>
        ),
    },
  ], [counts, featured, railProjects, recentWalks, recentTwins]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <h1 className={t.pageTitle}>Dashboard</h1>
      </div>
      <div className="min-h-0 flex-1">
        <CustomizableWidgetBoard boardId="dashboard-home" widgets={widgets} />
      </div>
    </div>
  );
}
