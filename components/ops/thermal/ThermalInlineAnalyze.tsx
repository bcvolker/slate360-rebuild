"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";
import type { ThermalJobSnapshot } from "@/hooks/useThermalJobRealtime";

const RUNNING = new Set(["queued", "processing", "running"]);

/**
 * Inline "analyze" affordance shown in the workbench when the open capture has no
 * decoded grid yet. Replaces the old dead-end ("run Process images from the Library
 * tab") with a one-click decode + detect that runs right here — single image or the
 * whole batch — and surfaces live cloud progress. The studio shell's realtime
 * listener refreshes the page when the job finishes, at which point the grid loads
 * and this placeholder is replaced by the probe viewer.
 *
 * Layout is single-column and touch-grade (stacked, ≥44px targets) so it carries
 * over unchanged to the future mobile shell.
 */
export function ThermalInlineAnalyze({
  sessionId,
  captureId,
  allIds,
  job,
}: {
  sessionId: string;
  captureId: string;
  /** All capture ids in the session — enables the batch "analyze all" action. */
  allIds: string[];
  /** Latest session job snapshot (realtime) — drives the live progress banner. */
  job?: ThermalJobSnapshot | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "one" | "all">(null);
  const [error, setError] = useState<string | null>(null);

  const jobRunning = job ? RUNNING.has(job.status) : false;
  const disabled = busy !== null || jobRunning;
  const otherCount = Math.max(0, allIds.length - 1);

  async function analyze(ids: string[], which: "one" | "all") {
    if (!ids.length) return;
    setBusy(which);
    setError(null);
    try {
      const res = await fetch("/api/ops/thermal/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          job_type: "extract_analyze",
          capture_ids: ids,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not start analysis");
      // Nudge the server component so the new job's "queued" state appears at once;
      // the shell's realtime listener refreshes again on completion to load the grid.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start analysis");
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-stretch gap-3 text-center">
      <div>
        <p className="text-sm font-semibold text-[var(--graphite-text-header)]">
          This image isn&rsquo;t analyzed yet
        </p>
        <p className="mt-1 text-xs text-[var(--graphite-muted)]">
          Analyzing decodes the radiometric data and scans for thermal problems —
          this unlocks per-pixel temperatures, emissivity tuning, spots, and
          findings. It runs in the cloud, usually under a couple of minutes.
        </p>
      </div>

      {jobRunning ? (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--graphite-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)] p-3 text-left">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--graphite-text-header)]">
            <span>{job?.stage ? `Analyzing · ${job.stage}` : "Analyzing…"}</span>
            <span>{Math.round(job?.progress_pct ?? 0)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--graphite-muted)_24%,transparent)]">
            <div
              className="h-full rounded-full bg-[var(--graphite-primary)] transition-[width] duration-500"
              style={{ width: `${Math.min(100, Math.max(4, job?.progress_pct ?? 4))}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--graphite-muted)]">
            Results appear here automatically when it finishes.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={t.primaryButton}
            disabled={disabled}
            onClick={() => analyze([captureId], "one")}
          >
            {busy === "one" ? "Starting…" : "Analyze this image"}
          </button>
          {otherCount > 0 ? (
            <button
              type="button"
              className={t.secondaryButton}
              disabled={disabled}
              onClick={() => analyze(allIds, "all")}
              title="Decode and scan every image in this session"
            >
              {busy === "all" ? "Starting…" : `Analyze all ${allIds.length} images`}
            </button>
          ) : null}
        </div>
      )}

      {error ? <p className="text-xs text-[#fca5a5]">{error}</p> : null}
    </div>
  );
}
