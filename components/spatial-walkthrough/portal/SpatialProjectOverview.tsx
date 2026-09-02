"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import { MondayProjectHero } from "@/components/projects/MondayProjectHero";
import type { ProjectOverviewData } from "@/lib/projects/load-project-overview-data";

function formatRelativeDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SpatialProjectOverview({ data }: { data: ProjectOverviewData }) {
  const base = `/projects/${data.projectId}`;
  const lastUploadLabel = data.lastFileUploadAt
    ? `Last upload ${formatRelativeDate(data.lastFileUploadAt)}`
    : "No uploads yet";

  return (
    <div className="space-y-5">
      <MondayProjectHero projectId={data.projectId} />

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
          href={data.recentWalkthroughs[0]?.href ?? `${base}/walkthroughs`}
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

