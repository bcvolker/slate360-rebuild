"use client";

import Link from "next/link";
import { FolderOpen } from "lucide-react";
import type { ClientHomeProject } from "@/lib/dashboard/load-client-home-data";
import { formatDashboardDate } from "@/lib/dashboard/format-dashboard-date";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { dashboardDesktopTokens as t } from "./dashboard-tokens";

type ClientHomeContentProps = {
  projects: ClientHomeProject[];
};

/**
 * Landing home for spatial-only client logins (docs/design/
 * CLIENT_ACCOUNT_HOME_2026-09.md) — deliberately product-agnostic copy, no
 * Twin 360 / Site Walk naming anywhere (those are pre-App-Store products).
 * Most recent project renders as a large hero; the rest scroll in a row.
 */
export function ClientHomeContent({ projects }: ClientHomeContentProps) {
  if (projects.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <h1 className={`${t.pageTitle} mb-3`}>Your Projects</h1>
        <DashboardEmptyState
          title="No projects yet"
          description="Once your first project is captured, it will appear here with everything you can access and share."
        />
      </div>
    );
  }

  const [hero, ...rest] = projects;

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto">
      <h1 className={t.pageTitle}>Your Projects</h1>

      <Link
        href={`/projects/${hero.id}`}
        className="group relative block aspect-[16/7] w-full shrink-0 overflow-hidden rounded-2xl border border-[var(--mkt-line)]"
      >
        {hero.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero.imageUrl}
            alt={hero.name}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--mkt-canvas-alt)]">
            <FolderOpen className="h-16 w-16 text-[var(--mkt-accent)]" strokeWidth={1} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
            Most recent
          </p>
          <p className="mt-1 truncate text-3xl font-semibold text-white">{hero.name}</p>
          <p className="mt-1 text-sm text-white/70">{formatDashboardDate(hero.createdAt)}</p>
          <span className="mt-4 inline-flex w-fit items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[var(--mkt-ink)] transition-opacity group-hover:opacity-90">
            Open project
          </span>
        </div>
      </Link>

      {rest.length > 0 ? (
        <div>
          <p className={`${t.sectionLabel} mb-2`}>All projects</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {rest.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group relative aspect-[4/3] w-56 shrink-0 overflow-hidden rounded-xl border border-[var(--mkt-line)]"
              >
                {project.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.imageUrl}
                    alt={project.name}
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--mkt-canvas-alt)]">
                    <FolderOpen className="h-10 w-10 text-[var(--mkt-accent)]" strokeWidth={1} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="truncate text-sm font-semibold text-white">{project.name}</p>
                  <p className="text-xs text-white/70">{formatDashboardDate(project.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
