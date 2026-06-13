"use client";

import Link from "next/link";
import { ArrowRight, Box, FolderOpen, MapPin, Users } from "lucide-react";
import { ProjectDetailEmptyState } from "@/components/projects/ProjectDetailEmptyState";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import type { ProjectOverviewData } from "@/lib/projects/load-project-overview-data";

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

type ProjectOverviewTabProps = {
  data: ProjectOverviewData;
};

export function ProjectOverviewTab({ data }: ProjectOverviewTabProps) {
  const hasActivity = data.recentActivity.length > 0;
  const lastUploadLabel = data.lastFileUploadAt
    ? `Last upload ${formatRelativeDate(data.lastFileUploadAt)}`
    : "No uploads yet";

  return (
    <div className="space-y-6">
      <section className={t.sectionCard}>
        <p className={t.eyebrow}>Overview</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--graphite-text-header)]">{data.name}</h2>
            {data.description ? (
              <p className="mt-2 text-sm leading-relaxed text-[var(--graphite-muted)]">{data.description}</p>
            ) : (
              <p className="mt-2 text-sm text-[var(--graphite-muted)]">No project description yet.</p>
            )}
          </div>
          <div className={t.metaGrid}>
            <div className={t.metaCell}>
              <p className={t.eyebrow}>Start</p>
              <p className="mt-1 text-sm font-semibold text-[var(--graphite-text-header)]">
                {formatDate(data.startDate)}
              </p>
            </div>
            <div className={t.metaCell}>
              <p className={t.eyebrow}>End</p>
              <p className="mt-1 text-sm font-semibold text-[var(--graphite-text-header)]">
                {formatDate(data.endDate)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Project counts">
        <p className={`${t.eyebrow} mb-3`}>Quick stats</p>
        <div className={t.statGrid}>
          <StatCard
            label="Walks"
            value={data.counts.walks}
            href={`/projects/${data.projectId}/walks`}
            icon={MapPin}
          />
          {data.showTwins ? (
            <StatCard
              label="Digital Twins"
              value={data.counts.twins}
              href={`/projects/${data.projectId}/twins`}
              icon={Box}
            />
          ) : null}
          <StatCard
            label="Files"
            value={data.counts.files}
            meta={lastUploadLabel}
            href={`/projects/${data.projectId}/slatedrop`}
            icon={FolderOpen}
          />
          <StatCard
            label="Team"
            value={data.counts.teamMembers}
            href={`/projects/${data.projectId}/team`}
            icon={Users}
          />
        </div>
      </section>

      <section className={t.sectionCard}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={t.eyebrow}>Recent activity</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--graphite-text-header)]">
              Latest walks, files, and updates
            </h2>
          </div>
        </div>

        {hasActivity ? (
          <ul className="mt-4 space-y-1">
            {data.recentActivity.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className={t.activityRow}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--graphite-text-header)]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--graphite-muted)]">
                      {item.meta} · {formatRelativeDate(item.occurredAt)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4">
            <ProjectDetailEmptyState
              title="No activity yet"
              description="Upload a plan, start a Site Walk, or add files to see activity here."
              actionLabel="Upload files"
              actionHref={`/projects/${data.projectId}/slatedrop`}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  meta,
  href,
  icon: Icon,
}: {
  label: string;
  value: number;
  meta?: string;
  href: string;
  icon: typeof MapPin;
}) {
  return (
    <Link href={href} className={t.statCard}>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] text-[var(--graphite-primary)]">
          <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
        <p className={t.statLabel}>{label}</p>
      </div>
      <p className={`${t.statValue} mt-2`}>{value}</p>
      <span className={t.statLink}>View all</span>
      {meta ? <p className="mt-1 text-[11px] text-[var(--graphite-muted)]">{meta}</p> : null}
    </Link>
  );
}
