"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProjectDetailEmptyState } from "@/components/projects/ProjectDetailEmptyState";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import type { ProjectOverviewData } from "@/lib/projects/load-project-overview-data";

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SpatialProjectOverview({ data }: { data: ProjectOverviewData }) {
  const base = `/projects/${data.projectId}`;
  const latest = data.latestWalkthrough;
  const lastUploadLabel = data.lastFileUploadAt
    ? `Last upload ${formatRelativeDate(data.lastFileUploadAt)}`
    : "No uploads yet";

  return (
    <div className="space-y-5">
      <section className={t.sectionCard}>
        <p className={t.eyebrow}>Project</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--graphite-text-header)]">{data.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--graphite-muted)]">
              {data.description || "No project description yet."}
            </p>
          </div>
          <div className={t.metaGrid}>
            <div className={t.metaCell}>
              <p className={t.eyebrow}>Start</p>
              <p className="mt-1 text-sm font-semibold text-[var(--graphite-text-header)]">{formatDate(data.startDate)}</p>
            </div>
            <div className={t.metaCell}>
              <p className={t.eyebrow}>End</p>
              <p className="mt-1 text-sm font-semibold text-[var(--graphite-text-header)]">{formatDate(data.endDate)}</p>
            </div>
          </div>
        </div>
      </section>

      {latest ? (
        <section className="overflow-hidden border border-white/10">
          <div className="aspect-[16/7] bg-white/[0.03]" />
          <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-4">
            <div>
              <p className="text-xs text-[var(--graphite-muted)]">Latest capture</p>
              <p className="text-lg text-white">{latest.title}</p>
              <p className="text-sm text-[var(--graphite-muted)]">
                {latest.capturedAt ? formatDate(latest.capturedAt) : ""}
                {latest.building ? ` · ${latest.building}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={latest.href} className="inline-flex h-12 items-center border border-white/20 px-4 text-sm">Open Walk</Link>
              <span className="inline-flex h-12 items-center border border-white/10 px-4 text-sm text-[var(--graphite-muted)]">Twin unavailable</span>
            </div>
          </div>
        </section>
      ) : (
        <ProjectDetailEmptyState
          title="No walkthroughs yet"
          description="Published Spatial Walkthroughs for this project will appear here."
          actionLabel="Open library"
          actionHref={`${base}/walkthroughs`}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <OverviewList
          title="Recent captures"
          empty="No captures in this project yet."
          href={`${base}/walkthroughs`}
          items={data.recentWalkthroughs.map((item) => ({
            id: item.id,
            title: item.title,
            meta: item.capturedAt ? formatRelativeDate(item.capturedAt) : "Date unset",
            href: item.href,
          }))}
        />
        <OverviewList
          title="Recent project files"
          empty={lastUploadLabel}
          href={`${base}/slatedrop`}
          items={data.recentFiles.map((item) => ({
            id: item.id,
            title: item.title,
            meta: formatRelativeDate(item.occurredAt),
            href: item.href,
          }))}
        />
        <OverviewList
          title="Recent pins"
          empty="No spatial pins yet."
          href={latest?.href ?? `${base}/walkthroughs`}
          items={data.recentPins.map((item) => ({
            id: item.id,
            title: item.title,
            meta: item.meta,
            href: item.href,
          }))}
        />
      </div>
    </div>
  );
}

function OverviewList({
  title,
  empty,
  href,
  items,
}: {
  title: string;
  empty: string;
  href: string;
  items: Array<{ id: string; title: string; meta: string; href: string }>;
}) {
  return (
    <section className={`${t.sectionCard} flex min-h-0 flex-col`}>
      <div className="flex items-center justify-between gap-2">
        <p className={t.eyebrow}>{title}</p>
        <Link href={href} className="text-xs font-semibold text-[var(--graphite-primary)]">
          View all
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--graphite-muted)]">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className={t.activityRow}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--graphite-text-header)]">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--graphite-muted)]">{item.meta}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

