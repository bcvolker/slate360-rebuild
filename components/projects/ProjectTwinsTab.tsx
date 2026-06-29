"use client";

import Link from "next/link";
import { ArrowRight, Box } from "lucide-react";
import { ProjectDetailEmptyState } from "@/components/projects/ProjectDetailEmptyState";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import type { ProjectTwinsTabData } from "@/lib/projects/load-project-twins-data";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProjectTwinsTab({ data, projectId }: { data: ProjectTwinsTabData; projectId: string }) {
  // Thread the project context into Twin capture so a twin started from inside a
  // project stays bound to it (the capture page consumes ?projectId=&mode=project).
  const captureHref = `/digital-twin/capture?projectId=${encodeURIComponent(projectId)}&mode=project`;

  if (!data.moduleVisible) {
    return (
      <ProjectDetailEmptyState
        title="Digital Twins are not available"
        description="Twin features are not enabled in this release build."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className={t.sectionCard}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={t.eyebrow}>Twins</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--graphite-text-header)]">
              Digital twins for this project
            </h2>
            <p className="mt-1 text-sm text-[var(--graphite-muted)]">
              {data.twins.length > 0
                ? `${data.twins.length} twin space${data.twins.length === 1 ? "" : "s"}.`
                : "No digital twins linked to this project yet."}
            </p>
          </div>
          <Link href={captureHref} className={t.primaryButton}>
            Create from capture
          </Link>
        </div>
      </section>

      {data.twins.length === 0 ? (
        <ProjectDetailEmptyState
          title="No twins yet"
          description="Capture footage and submit a twin job to create a digital twin for this project."
          actionLabel="Open Twin capture"
          actionHref={captureHref}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.twins.map((twin) => (
            <Link
              key={twin.id}
              href={`/digital-twin/twins/${encodeURIComponent(twin.id)}`}
              className={t.statCard}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--twin360-blue)_12%,transparent)] text-[var(--twin360-blue)]">
                  <Box className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--graphite-text-header)]">
                    {twin.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--graphite-muted)]">
                    {twin.statusLabel} · Updated {formatDate(twin.updatedAt)}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
