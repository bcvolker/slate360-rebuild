"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, MapPin, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PROJECT_DETAIL_TABS,
  buildProjectDetailHref,
  resolveActiveProjectDetailTab,
  type ProjectDetailTabId,
} from "@/components/projects/projectDetailTabs";
import { projectDetailTokens as t, resolveStatusPillClass } from "@/components/projects/project-detail-tokens";

type ProjectDetailTabsProps = {
  projectId: string;
  hiddenTabIds?: ProjectDetailTabId[];
};

export function ProjectDetailTabs({ projectId, hiddenTabIds = [] }: ProjectDetailTabsProps) {
  const pathname = usePathname() ?? "";
  const activeTab = resolveActiveProjectDetailTab(pathname, projectId);
  const visibleTabs = PROJECT_DETAIL_TABS.filter((tab) => !hiddenTabIds.includes(tab.id));

  return (
    <nav className={t.tabRail} aria-label="Project sections">
      {visibleTabs.map((tab) => {
        const href = buildProjectDetailHref(projectId, tab.segment);
        const active = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={href}
            className={cn(t.tabLink, active && t.tabLinkActive)}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

type ProjectDetailShellProps = {
  projectId: string;
  projectName: string;
  status: string;
  locationLabel: string;
  showTwins?: boolean;
  children: ReactNode;
};

export function ProjectDetailShell({
  projectId,
  projectName,
  status,
  locationLabel,
  showTwins = true,
  children,
}: ProjectDetailShellProps) {
  const hiddenTabIds: ProjectDetailTabId[] = showTwins ? [] : ["twins"];

  return (
    <div className={t.page}>
      <header className={t.header}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link href="/projects" className={t.backLink}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Projects
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className={t.projectTitle}>{projectName}</h1>
              <span className={cn(t.statusPillBase, resolveStatusPillClass(status))}>{status}</span>
            </div>
            <p className={t.locationRow}>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--graphite-primary)]" aria-hidden />
              <span className="truncate">{locationLabel}</span>
            </p>
          </div>
          <Link
            href="/settings"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)] transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)] hover:text-[var(--graphite-text-header)]"
            aria-label="Account settings"
          >
            <Settings2 className="h-4 w-4" />
          </Link>
        </div>
        <ProjectDetailTabs projectId={projectId} hiddenTabIds={hiddenTabIds} />
      </header>
      <div className={t.content}>{children}</div>
    </div>
  );
}
