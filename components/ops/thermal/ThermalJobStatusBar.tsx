"use client";

import { useEffect, useState } from "react";
import type { ThermalJobSnapshot } from "@/hooks/useThermalJobRealtime";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

type ThermalJobStatusBarProps = {
  job: ThermalJobSnapshot | null;
  connected: boolean;
};

// A queued job that never starts means the cloud worker isn't picking up runs —
// almost always Trigger.dev compute being paused (out of credits / billing hold),
// not a code problem. Surface that instead of an endless spinner.
const STALL_AFTER_MS = 90_000;

export function ThermalJobStatusBar({ job, connected }: ThermalJobStatusBarProps) {
  // Re-render on a timer while queued so the stall warning can appear without a
  // DB change (a stuck row never emits a realtime update).
  const [, setTick] = useState(0);
  const isQueued = job?.status === "queued";
  useEffect(() => {
    if (!isQueued) return;
    const id = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, [isQueued]);

  if (!job) return null;

  const active = job.status === "queued" || job.status === "processing";
  const queuedMs = isQueued && job.created_at ? Date.now() - new Date(job.created_at).getTime() : 0;
  const stalled = isQueued && queuedMs > STALL_AFTER_MS;

  return (
    <div className={t.card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={t.eyebrow}>Processing job</p>
          <p className="mt-1 text-sm font-semibold capitalize text-[var(--graphite-text-header)]">
            {job.status.replace("_", " ")}
            {job.stage ? ` · ${job.stage}` : ""}
          </p>
        </div>
        <p className="text-xs text-[var(--graphite-muted)]">
          {connected ? "Live" : "Polling"} · {job.progress_pct}%
        </p>
      </div>
      {active ? (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--graphite-muted)_16%,transparent)]">
          <div
            className="h-full rounded-full bg-[var(--graphite-primary)] transition-all"
            style={{ width: `${Math.max(5, job.progress_pct)}%` }}
          />
        </div>
      ) : null}
      {stalled ? (
        <div className="mt-3 rounded-lg border border-[color-mix(in_srgb,#fbbf24_40%,transparent)] bg-[color-mix(in_srgb,#fbbf24_10%,transparent)] p-3 text-xs text-[var(--graphite-text-body)]">
          <p className="font-semibold text-[var(--graphite-text-header)]">Cloud processing hasn’t started</p>
          <p className="mt-1 text-[var(--graphite-muted)]">
            This job has been waiting over a minute without a worker picking it up. That
            usually means cloud processing is paused on the Trigger.dev account (out of
            monthly credits or a billing hold) — not a problem with your images. Check the
            Trigger.dev billing/usage page; queued jobs run automatically once it’s restored.
          </p>
        </div>
      ) : null}
      {job.error_log ? (
        <p className="mt-3 text-sm text-[#fca5a5]">{job.error_log}</p>
      ) : null}
    </div>
  );
}
