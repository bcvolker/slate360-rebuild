"use client";

import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SplatLabStageRecord } from "@/lib/splat-lab/job-store";

export function stageDot(status: string | undefined): string {
  return status === "done" ? "bg-[var(--graphite-primary)]"
    : status === "failed" ? "bg-red-500"
    : status === "blocked" ? "bg-[var(--graphite-muted)]"
    : status === "running" ? "bg-[var(--twin360-blue)]"
    : "bg-zinc-600";
}

export function StageCard({
  index,
  title,
  stage,
  onRerun,
  children,
  actions,
}: {
  index: number;
  title: string;
  stage: SplatLabStageRecord | undefined;
  onRerun?: () => void;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const status = stage?.status ?? "queued";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--graphite-text-header)]">
          <span className={cn("size-2 rounded-full", stageDot(stage?.status))} />
          {index}. {title}
        </span>
        <div className="flex items-center gap-2">
          {actions}
          <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
            {status}{stage?.elapsed_s ? ` · ${formatElapsed(stage.elapsed_s)}` : ""}
          </span>
          {onRerun ? (
            <button onClick={onRerun} title="Rerun from here" className="text-[var(--graphite-muted)] hover:text-white">
              <RotateCcw className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      {stage?.detail ? <p className="mt-1.5 text-[11px] text-zinc-400">{stage.detail}</p> : null}
      {stage?.error ? <p className="mt-1 text-[11px] text-red-400">{stage.error}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function formatElapsed(s: number): string {
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  if (m < 60) return `${m}m ${rem}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
