"use client";

import type { ThermalJobSnapshot } from "@/hooks/useThermalJobRealtime";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

type ThermalJobStatusBarProps = {
  job: ThermalJobSnapshot | null;
  connected: boolean;
};

export function ThermalJobStatusBar({ job, connected }: ThermalJobStatusBarProps) {
  if (!job) return null;

  const active = job.status === "queued" || job.status === "processing";

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
      {job.error_log ? (
        <p className="mt-3 text-sm text-[#fca5a5]">{job.error_log}</p>
      ) : null}
    </div>
  );
}
