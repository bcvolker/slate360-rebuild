"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Footprints, Loader2, MapPin, AlertTriangle } from "lucide-react";
import { ProjectDetailEmptyState } from "@/components/projects/ProjectDetailEmptyState";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import { buildCaptureLaunchUrl, buildCaptureSummaryUrl } from "@/lib/site-walk/capture-v2-config";
import { cn } from "@/lib/utils";
import type { ProjectWalksTabData } from "@/lib/projects/load-project-walks-data";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isCompleted(status: string): boolean {
  return /complete/i.test(status);
}

export function ProjectWalksTab({ data }: { data: ProjectWalksTabData }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** New walks belong to THIS project: create a session scoped to it, then open capture. */
  async function startWalk() {
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/site-walk/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: data.projectId }),
      });
      const json = (await res.json().catch(() => ({}))) as { session?: { id?: string }; error?: string };
      const id = json.session?.id;
      if (!res.ok || !id) throw new Error(json.error ?? "Couldn't start the walk. Please try again.");
      router.push(buildCaptureLaunchUrl({ session: id }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the walk.");
      setStarting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className={t.sectionCard}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={t.eyebrow}>Walks</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--graphite-text-header)]">Site Walk sessions</h2>
            <p className="mt-1 text-sm text-[var(--graphite-muted)]">
              {data.walks.length > 0
                ? `${data.walks.length} walk${data.walks.length === 1 ? "" : "s"} for this project. Open one to resume or review.`
                : "No walks recorded for this project yet."}
            </p>
          </div>
          <button type="button" onClick={startWalk} disabled={starting} className={cn(t.primaryButton, starting && "opacity-70")}>
            {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Footprints className="mr-2 h-4 w-4" aria-hidden />}
            {starting ? "Starting…" : "Start new walk"}
          </button>
        </div>
        {error ? (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-500/25">
            <AlertTriangle className="h-4 w-4" aria-hidden /> {error}
          </p>
        ) : null}
      </section>

      {data.walks.length === 0 ? (
        <ProjectDetailEmptyState
          title="No walks yet"
          description="Start a Site Walk to capture photos, notes, and plan pins for this project."
          actionLabel="Start new walk"
          actionHref={`/projects/${data.projectId}/plans`}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.walks.map((walk) => {
            const done = isCompleted(walk.status);
            const href = done ? buildCaptureSummaryUrl(walk.id) : buildCaptureLaunchUrl({ session: walk.id });
            return (
              <Link key={walk.id} href={href} className={cn(t.activityRow, "border border-[var(--mobile-app-card-border)]")}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] text-[var(--graphite-primary)]">
                  <MapPin className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--graphite-text-header)]">{walk.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-[var(--graphite-muted)]">
                    {walk.status} · Updated {formatDate(walk.updatedAt)}
                  </span>
                </span>
                <span className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-lg bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)] px-2.5 py-1 text-xs font-semibold text-[var(--graphite-primary)]">
                  {done ? "Review" : "Resume"}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
