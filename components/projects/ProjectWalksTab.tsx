"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { ProjectDetailEmptyState } from "@/components/projects/ProjectDetailEmptyState";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import type { ProjectWalksTabData } from "@/lib/projects/load-project-walks-data";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProjectWalksTab({ data }: { data: ProjectWalksTabData }) {
  return (
    <div className="space-y-6">
      <section className={t.sectionCard}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={t.eyebrow}>Walks</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--graphite-text-header)]">
              Site Walk sessions
            </h2>
            <p className="mt-1 text-sm text-[var(--graphite-muted)]">
              {data.walks.length > 0
                ? `${data.walks.length} walk${data.walks.length === 1 ? "" : "s"} for this project.`
                : "No walks recorded for this project yet."}
            </p>
          </div>
          <Link href="/site-walk/setup" className={t.primaryButton}>
            Start new Site Walk
          </Link>
        </div>
      </section>

      {data.walks.length === 0 ? (
        <ProjectDetailEmptyState
          title="No walks yet"
          description="Start a Site Walk to capture photos, notes, and plan pins for this project."
          actionLabel="Start new Site Walk"
          actionHref="/site-walk/setup"
        />
      ) : (
        <ul className="space-y-2">
          {data.walks.map((walk) => (
            <li key={walk.id}>
              <Link href={`/site-walk/capture-v2?session=${encodeURIComponent(walk.id)}`} className={t.activityRow}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] text-[var(--graphite-primary)]">
                  <MapPin className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--graphite-text-header)]">
                    {walk.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--graphite-muted)]">
                    {walk.status} · Updated {formatDate(walk.updatedAt)}
                    {walk.startedAt ? ` · Started ${formatDate(walk.startedAt)}` : ""}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
