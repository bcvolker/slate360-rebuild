"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Box, FileCheck, FolderOpen, Footprints, Loader2, MapPin, Upload, UserPlus, Users, type LucideIcon } from "lucide-react";
import { ProjectDetailEmptyState } from "@/components/projects/ProjectDetailEmptyState";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import { startProjectWalk, StartWalkError } from "@/lib/site-walk/start-walk";
import type { ProjectOverviewData } from "@/lib/projects/load-project-overview-data";

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type ProjectOverviewTabProps = {
  data: ProjectOverviewData;
};

export function ProjectOverviewTab({ data }: ProjectOverviewTabProps) {
  const hasActivity = data.recentActivity.length > 0;
  const base = `/projects/${data.projectId}`;
  const lastUploadLabel = data.lastFileUploadAt
    ? `Last upload ${formatRelativeDate(data.lastFileUploadAt)}`
    : "No uploads yet";

  return (
    <div className="space-y-5">
      {/* Identity */}
      <section className={t.sectionCard}>
        <p className={t.eyebrow}>Overview</p>
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

      {/* Desktop fills width: actions + stats (2/3) beside activity (1/3); stacks on mobile */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section aria-label="Quick actions">
            <p className={`${t.eyebrow} mb-3`}>Quick actions</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StartWalkTile projectId={data.projectId} projectName={data.name} />
              {data.showTwins ? (
                <ActionTile
                  label="Start a Twin"
                  hint="3D scan this space"
                  href={`/digital-twin/capture?projectId=${encodeURIComponent(data.projectId)}&mode=project`}
                  icon={Box}
                />
              ) : null}
              <ActionTile label="Walk with drawings" hint="Pin photos to the plan" href={`${base}/plans`} icon={Footprints} />
              <ActionTile label="Upload a drawing" hint="PDF plan set" href={`${base}/plans`} icon={Upload} />
              <ActionTile label="Invite team" hint="Add collaborators" href={`${base}/team`} icon={UserPlus} />
            </div>
          </section>

          <section aria-label="Project counts">
            <p className={`${t.eyebrow} mb-3`}>Quick stats</p>
            <div className={t.statGrid}>
              <StatCard label="Walks" value={data.counts.walks} href={`${base}/walks`} icon={MapPin} />
              {data.showTwins ? (
                <StatCard label="Digital Twins" value={data.counts.twins} href={`${base}/twins`} icon={Box} />
              ) : null}
              <StatCard label="Deliverables" value={data.counts.deliverables} href={`${base}/deliverables`} icon={FileCheck} />
              <StatCard label="Files" value={data.counts.files} meta={lastUploadLabel} href={`${base}/slatedrop`} icon={FolderOpen} />
              <StatCard label="Team" value={data.counts.teamMembers} href={`${base}/team`} icon={Users} />
            </div>
          </section>
        </div>

        {/* Recent activity — fills the right column on desktop */}
        <section className={`${t.sectionCard} flex min-h-0 flex-col lg:col-span-1`}>
          <p className={t.eyebrow}>Recent activity</p>
          {hasActivity ? (
            <ul className="mt-3 flex-1 space-y-1 overflow-y-auto">
              {data.recentActivity.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className={t.activityRow}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--graphite-text-header)]">{item.title}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--graphite-muted)]">
                        {item.meta} · {formatRelativeDate(item.occurredAt)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 flex-1">
              <ProjectDetailEmptyState
                title="No activity yet"
                description="Upload a plan, start a Site Walk, or add files to see activity here."
                actionLabel="Upload files"
                actionHref={`${base}/slatedrop`}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** One-click no-plan walk start from the project home (the design's "big Start Walk"). */
function StartWalkTile({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const url = await startProjectWalk(projectId, projectName, "project_overview");
      router.push(url);
    } catch (e) {
      setError(e instanceof StartWalkError ? e.message : "Could not start the walk. Try again.");
      setStarting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleStart}
      disabled={starting}
      aria-busy={starting}
      className={`${t.sectionCard} flex items-center gap-3 !p-4 text-left transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] disabled:opacity-70`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-primary)]">
        {starting ? (
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} aria-hidden />
        ) : (
          <MapPin className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[var(--graphite-text-header)]">
          {starting ? "Starting…" : "Start a Site Walk"}
        </span>
        {error ? (
          <span role="alert" className="block text-xs text-[var(--graphite-text-header)]">
            {error}
          </span>
        ) : (
          <span className="block truncate text-xs text-[var(--graphite-muted)]">
            Capture photos & notes now
          </span>
        )}
      </span>
    </button>
  );
}

function ActionTile({ label, hint, href, icon: Icon }: { label: string; hint: string; href: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className={`${t.sectionCard} flex items-center gap-3 !p-4 transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)]`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-primary)]">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[var(--graphite-text-header)]">{label}</span>
        <span className="block truncate text-xs text-[var(--graphite-muted)]">{hint}</span>
      </span>
    </Link>
  );
}

function StatCard({ label, value, meta, href, icon: Icon }: { label: string; value: number; meta?: string; href: string; icon: LucideIcon }) {
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
