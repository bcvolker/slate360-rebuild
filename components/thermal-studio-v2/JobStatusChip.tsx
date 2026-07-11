"use client";

import { useThermalJobRealtime, type ThermalJobSnapshot } from "@/hooks/useThermalJobRealtime";

/**
 * R1 "never lie" reliability pack: replaces the static "Idle" chip with the
 * real thermal_processing_jobs row for this session (Realtime), including the
 * partial-failure and failed states with a Retry action — a stuck/failed job
 * must never read as quietly fine.
 */
export function JobStatusChip({
  sessionId,
  onRetry,
}: {
  sessionId: string;
  onRetry?: (jobType: string, failedCaptureIds: string[]) => void;
}) {
  const { job } = useThermalJobRealtime(sessionId);
  const row = job as ThermalJobSnapshot | null;

  if (!row || row.status === "completed" && !row.partial) {
    return (
      <span
        title={row?.partial ? undefined : "No processing job running"}
        className="flex items-center gap-1.5 rounded-md border border-[var(--mobile-app-card-border)] px-2 py-0.5 text-[11px] text-[var(--graphite-muted)]"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--graphite-muted)]" />
        {row?.status === "completed" ? "Complete" : "Idle"}
      </span>
    );
  }

  if (row.status === "queued" || row.status === "processing") {
    return (
      <span className="flex items-center gap-1.5 rounded-md border border-[var(--mobile-app-card-border)] px-2 py-0.5 text-[11px] text-[var(--graphite-muted)]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--graphite-muted)]" />
        {row.status === "queued" ? "Queued…" : `Processing ${row.progress_pct}%`}
      </span>
    );
  }

  // failed OR partial completion — both need a visible reason + Retry.
  // A hard failure (dispatch/reconciler) has no per-capture split, so retry
  // resubmits the whole original scope; a partial completion retries only the misses.
  const failedIds = row.partial ? (row.failed_capture_ids ?? []) : (row.input_capture_ids ?? []);
  const label = row.partial
    ? `${failedIds.length} failed — Retry`
    : "Failed — Retry";

  return (
    <button
      type="button"
      onClick={() => onRetry?.(row.job_type ?? "extract", failedIds)}
      title={row.error_log ?? "Job failed"}
      className="flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-400"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      {label}
    </button>
  );
}
