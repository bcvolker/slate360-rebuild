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
  /** Cover image (a recent site-walk photo or twin still). Falls back to a branded band. */
  coverImageUrl?: string | null;
  children: ReactNode;
};

export function ProjectDetailShell({
  projectId,
  projectName,
  status,
  locationLabel,
  showTwins = true,
  coverImageUrl = null,
  children,
}: ProjectDetailShellProps) {
  const hiddenTabIds: ProjectDetailTabId[] = showTwins ? [] : ["twins"];

  return (
    <div className={t.page}>
      {/* Cover band — image or branded gradient with the project identity overlaid */}
      <div className="relative -mx-4 h-36 overflow-hidden lg:mx-0 lg:rounded-2xl lg:border lg:border-[var(--mobile-app-card-border)]">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImageUrl} alt={projectName} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 130% at 12% 0%, color-mix(in_srgb,var(--graphite-primary) 30%, var(--graphite-canvas)) 0%, var(--graphite-canvas) 70%)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <Link href="/projects" className="inline-flex items-center gap-1.5 rounded-lg bg-black/35 px-2.5 py-1.5 text-xs font-semibold text-white/90 hover:bg-black/55">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Projects
          </Link>
          <Link
            href="/settings"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/35 text-white/90 hover:bg-black/55"
            aria-label="Account settings"
          >
            <Settings2 className="h-4 w-4" />
          </Link>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold text-white lg:text-2xl">{projectName}</h1>
            <span className={cn(t.statusPillBase, resolveStatusPillClass(status))}>{status}</span>
          </div>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-white/75">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{locationLabel}</span>
          </p>
        </div>
      </div>

      <header className={t.header}>
        <ProjectDetailTabs projectId={projectId} hiddenTabIds={hiddenTabIds} />
      </header>
      <div className={t.content}>{children}</div>
    </div>
  );
}
