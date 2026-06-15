"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, FileUp, Footprints, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import { ProjectDetailEmptyState } from "@/components/projects/ProjectDetailEmptyState";
import {
  uploadPlanSet,
  isPdfPlan,
  PlanUploadError,
  type PlanUploadProgress,
} from "@/lib/site-walk/plan-upload";
import type { ProjectPlansTabData, PlansTabPlanSet } from "@/lib/projects/plans-tab-data";

type ProjectPlansTabProps = {
  data: ProjectPlansTabData;
  canManage: boolean;
};

const STATUS_LABEL: Record<PlansTabPlanSet["status"], string> = {
  ready: "Ready",
  processing: "Converting",
  pending: "Queued",
  failed: "Failed",
  archived: "Archived",
};

export function ProjectPlansTab({ data, canManage }: ProjectPlansTabProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<PlanUploadProgress | null>(null);
  const busy = progress !== null && progress.stage !== "complete" && progress.stage !== "error";

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!isPdfPlan(file)) {
      setProgress({ stage: "error", message: "Plans accepts PDF plan sets only." });
      return;
    }
    try {
      await uploadPlanSet(data.projectId, file, setProgress);
      // Refresh the server data so the new (converting) set appears.
      router.refresh();
    } catch (error) {
      setProgress({
        stage: "error",
        message: error instanceof PlanUploadError ? error.message : "Plan upload failed.",
      });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const hasPlans = data.planSets.length > 0;

  return (
    <div className="space-y-6">
      <section className={t.sectionCard}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={t.eyebrow}>Plans</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--graphite-text-header)]">
              Plan sets for this project
            </h2>
            <p className="mt-1 text-sm text-[var(--graphite-muted)]">
              {hasPlans
                ? "Start a walk on a plan to pin photos to their location."
                : "Add a PDF plan set to walk the job against its drawings."}
            </p>
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className={cn(t.primaryButton, busy && "pointer-events-none opacity-70")}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FileUp className="mr-2 h-4 w-4" aria-hidden />
              )}
              {busy ? "Adding…" : "Add a plan"}
            </button>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />

        {progress ? (
          <div
            role="status"
            className={cn(
              "mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
              progress.stage === "error"
                ? "bg-red-500/10 text-red-300 ring-1 ring-inset ring-red-500/25"
                : progress.stage === "complete"
                  ? "bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)] text-[var(--graphite-primary)]"
                  : "bg-[color-mix(in_srgb,var(--graphite-muted)_12%,transparent)] text-[var(--graphite-text-body)]",
            )}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {progress.stage === "error" ? <AlertTriangle className="h-4 w-4" aria-hidden /> : null}
            <span>{progress.message}</span>
          </div>
        ) : null}
      </section>

      {hasPlans ? (
        <ul className="space-y-3">
          {data.planSets.map((set) => (
            <li key={set.id} className={cn(t.sectionCard, "flex items-center gap-4")}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] text-[var(--graphite-primary)]">
                <FileText className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[var(--graphite-text-header)]">{set.title}</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-[var(--graphite-muted)]">
                  <span>
                    {set.pageCount} sheet{set.pageCount === 1 ? "" : "s"}
                  </span>
                  <span aria-hidden>·</span>
                  <StatusPill status={set.status} />
                </p>
                {set.status === "failed" && set.processingError ? (
                  <p className="mt-1 truncate text-xs text-red-300">{set.processingError}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => startWalk(router, data.projectId, set.id)}
                disabled={set.status !== "ready"}
                title={set.status === "ready" ? "Walk this plan" : "Available once conversion finishes"}
                className={cn(
                  t.secondaryButton,
                  "shrink-0",
                  set.status !== "ready" && "cursor-not-allowed opacity-50",
                )}
              >
                <Footprints className="mr-1.5 h-4 w-4" aria-hidden />
                Start walk
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ProjectDetailEmptyState
          title="No plans yet"
          description="Add a PDF plan set and we'll convert it for walking. Photos you capture on the plan get pinned to their exact location."
        />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: PlansTabPlanSet["status"] }) {
  const tone =
    status === "ready"
      ? "bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-primary)]"
      : status === "failed"
        ? "bg-red-500/10 text-red-300"
        : "bg-[color-mix(in_srgb,var(--graphite-muted)_14%,transparent)] text-[var(--graphite-muted)]";
  return (
    <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", tone)}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Start-walk entry. Slice 2 replaces this with the plan-aware walk-start sheet;
 *  today it routes into the Site Walk app carrying the project + plan context. */
function startWalk(
  router: ReturnType<typeof useRouter>,
  projectId: string,
  planSetId: string,
) {
  const params = new URLSearchParams({ projectId, planSetId });
  router.push(`/site-walk?${params.toString()}`);
}
