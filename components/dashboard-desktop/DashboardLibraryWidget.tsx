"use client";

import { FolderOpen, MapPin, Boxes } from "lucide-react";
import type {
  DashboardRecentProject,
  DashboardRecentTwin,
  DashboardRecentWalk,
} from "@/lib/dashboard/load-dashboard-home-data";
import { formatDashboardDate } from "@/lib/dashboard/format-dashboard-date";
import { DashboardRowLink } from "./DashboardRowLink";
import { DashboardEmptyState } from "./DashboardEmptyState";

export type LibraryTabId = "projects" | "walks" | "twins";

type DashboardLibraryWidgetProps = {
  activeTab: LibraryTabId;
  onTabChange: (tab: LibraryTabId) => void;
  projects: DashboardRecentProject[];
  walks: DashboardRecentWalk[];
  twins: DashboardRecentTwin[];
  walksInProgress: number;
  twinsDraft: number;
};

/**
 * Consolidates what used to be three separate stacked list cards (Recent Projects,
 * Recent Site Walks, Twin 360) into one tabbed widget — one grid slot, fixed-height
 * scrollable tab body, instead of three cards eating the collapsed grid.
 * (docs/design/DASHBOARD_EXPANDABLE_WORKSPACE_LOCKED.md, section 2b)
 */
export function DashboardLibraryWidget({
  activeTab,
  onTabChange,
  projects,
  walks,
  twins,
  walksInProgress,
  twinsDraft,
}: DashboardLibraryWidgetProps) {
  const tabs: Array<{ id: LibraryTabId; label: string; badge?: number }> = [
    { id: "projects", label: "Projects" },
    { id: "walks", label: "Site Walks", badge: walksInProgress || undefined },
    { id: "twins", label: "Twin 360", badge: twinsDraft || undefined },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex shrink-0 items-center gap-1 border-b border-white/[0.06] pb-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-primary)]"
                  : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
              }`}
            >
              {tab.label}
              {tab.badge ? (
                <span className="rounded-md bg-[color-mix(in_srgb,var(--graphite-primary)_22%,transparent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--graphite-primary)]">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === "projects" ? (
          projects.length === 0 ? (
            <DashboardEmptyState title="No projects" description="Create a project to get started." actionLabel="New project" actionHref="/projects" />
          ) : (
            <div className="flex flex-col gap-2">
              {projects.slice(0, 8).map((p) => (
                <DashboardRowLink key={p.id} href={`/projects/${p.id}`} icon={FolderOpen} title={p.name} meta={`${p.status} · ${formatDashboardDate(p.createdAt)}`} />
              ))}
            </div>
          )
        ) : null}

        {activeTab === "walks" ? (
          walks.length === 0 ? (
            <DashboardEmptyState title="No site walks yet" description="Start a walk from Site Walk on mobile." actionLabel="Browse walks" actionHref="/site-walks" />
          ) : (
            <div className="flex flex-col gap-2">
              {walks.slice(0, 8).map((w) => (
                <DashboardRowLink key={w.id} href={`/site-walk/walks/${w.id}`} icon={MapPin} title={w.title} meta={`${w.status} · ${formatDashboardDate(w.updatedAt)}`} />
              ))}
            </div>
          )
        ) : null}

        {activeTab === "twins" ? (
          twins.length === 0 ? (
            <DashboardEmptyState title="No twins yet" description="Capture a space to build a twin." actionLabel="Open Twin 360" actionHref="/digital-twins" />
          ) : (
            <div className="flex flex-col gap-2">
              {twins.slice(0, 8).map((tw) => (
                <DashboardRowLink key={tw.id} href={`/digital-twin/twins/${tw.id}`} icon={Boxes} title={tw.title} meta={`${tw.status} · ${formatDashboardDate(tw.updatedAt)}`} />
              ))}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
