"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  DashboardNeedsAttentionItem,
  DashboardRecentProject,
  DashboardRecentWalk,
} from "@/lib/dashboard/load-dashboard-home-data";
import { formatDashboardDate } from "@/lib/dashboard/format-dashboard-date";
import { CreateSheet } from "./CreateSheet";

type Props = {
  recentProjects: DashboardRecentProject[];
  recentWalks: DashboardRecentWalk[];
  needsAttention: DashboardNeedsAttentionItem[];
};

export function CreatorHome({ recentProjects, recentWalks, needsAttention }: Props) {
  const [create, setCreate] = useState(false);
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 lg:px-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">Projects</h1>
        <button type="button" onClick={() => setCreate(true)} className="inline-flex h-12 items-center border border-white/20 px-4 text-sm text-white" data-testid="global-create">
          + Create
        </button>
      </header>

      <section>
        <p className="mb-4 text-sm text-[var(--graphite-muted)]">Recent / active</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {recentProjects.length === 0 ? (
            <p className="text-sm text-[var(--graphite-text-body)]">No projects yet. Create one to start a walkthrough.</p>
          ) : recentProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="group block overflow-hidden border border-white/10">
              <div className="aspect-video bg-white/[0.03]">
                {project.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={project.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="px-3 py-3">
                <p className="truncate text-base text-white">{project.name}</p>
                <p className="mt-1 text-xs text-[var(--graphite-muted)]">
                  {project.status} · {formatDashboardDate(project.createdAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {needsAttention.length ? (
        <section>
          <p className="mb-3 text-sm text-[var(--graphite-muted)]">Needs attention</p>
          <div className="flex flex-col gap-2">
            {needsAttention.slice(0, 6).map((row) => (
              <a key={row.id} href={row.linkPath || "/dashboard"} className="flex min-h-12 items-center justify-between gap-3 border-b border-white/10 py-2">
                <span className="truncate text-sm text-white">{row.title}</span>
                <span className="shrink-0 text-xs text-[var(--graphite-muted)]">{formatDashboardDate(row.createdAt)}</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {recentWalks.length ? (
        <section>
          <p className="mb-3 text-sm text-[var(--graphite-muted)]">Recent deliverables</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentWalks.slice(0, 8).map((walk) => (
              <a key={walk.id} href={`/spatial-walkthrough/${walk.id}`} className="w-44 shrink-0 border border-white/10 p-3">
                <p className="truncate text-sm text-white">{walk.title}</p>
                <p className="mt-1 text-xs text-[var(--graphite-muted)]">{walk.status}</p>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <CreateSheet open={create} onClose={() => setCreate(false)} />
    </div>
  );
}
