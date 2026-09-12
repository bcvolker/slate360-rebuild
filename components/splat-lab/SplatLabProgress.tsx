"use client";

import { useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SplatViewerCore } from "@/components/digital-twin/splat-viewer-core";
import type { SplatLabJob, SplatLabStageRecord } from "@/lib/splat-lab/job-store";

export function SplatLabProgress({ job, jobId }: { job: SplatLabJob | null; jobId: string }) {
  const status = job?.status ?? "queued";
  const stages = job?.stages ?? [];
  const hasModel = Boolean(job?.modelPath);
  const modelUrl = hasModel ? `/api/splat-lab/jobs/${jobId}/model` : null;
  const [showLive, setShowLive] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">Pipeline</p>
          <StatusPill status={status} />
        </div>
        <div className="mt-3 space-y-2">
          {stages.length === 0 ? (
            <p className="text-xs text-[var(--graphite-muted)]">Starting…</p>
          ) : stages.map((s) => <StageRow key={s.name} stage={s} />)}
        </div>
        {job?.error ? <p className="mt-3 text-xs text-red-400">{job.error}</p> : null}
        {job?.manifest ? (
          <details className="mt-3">
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">Manifest</summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-white/10 bg-[var(--graphite-canvas)] p-2 text-[10px] text-zinc-400">{JSON.stringify(job.manifest, null, 2)}</pre>
          </details>
        ) : null}
      </div>

      <div className="relative min-h-[360px] rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur">
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">Preview</p>
          {hasModel ? (
            <div className="flex items-center gap-1">
              <a href={modelUrl ?? "#"} download className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-[var(--graphite-muted)] hover:text-white">
                <Download className="size-3" /> Export
              </a>
              <button onClick={() => setShowLive((v) => !v)} className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px]", showLive ? "border-[var(--twin360-blue)] text-[var(--twin360-blue)]" : "border-white/10 text-[var(--graphite-muted)] hover:text-white")}>
                <Eye className="size-3" /> Live View
              </button>
            </div>
          ) : null}
        </div>
        {modelUrl ? (
          <SplatViewerCore src={modelUrl} className="rounded-xl" />
        ) : (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-2 p-6 text-center">
            {status === "running" || status === "queued" ? (
              <>
                <Loader2 className="size-6 animate-spin text-[var(--twin360-blue)]" />
                <p className="text-xs text-[var(--graphite-muted)]">Waiting for a trained model…</p>
                <p className="max-w-[260px] text-[10px] text-zinc-600">
                  SfM + training run on the local 3090. A 300k-step run takes a few hours; the preview appears once export finishes.
                </p>
              </>
            ) : (
              <p className="text-xs text-[var(--graphite-muted)]">No model produced. Run the pipeline to begin.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const color = status === "completed" ? "bg-[var(--graphite-primary)]"
    : status === "failed" ? "bg-red-500"
    : status === "blocked" ? "bg-[var(--graphite-muted)]"
    : status === "running" ? "bg-[var(--twin360-blue)]"
    : "bg-zinc-600";
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
      <span className={cn("h-2 w-2 rounded-full", color)} /> {status}
    </span>
  );
}

const STAGE_LABELS: Record<string, string> = {
  frames: "Prepare Images", mask: "Remove People", sfm: "Structure-from-Motion",
  train: "Splat Generation", export: "Export",
};

function StageRow({ stage }: { stage: SplatLabStageRecord }) {
  const dot = stage.status === "done" ? "bg-[var(--graphite-primary)]"
    : stage.status === "failed" ? "bg-red-500"
    : stage.status === "blocked" ? "bg-[var(--graphite-muted)]"
    : stage.status === "running" ? "bg-[var(--twin360-blue)]"
    : "bg-zinc-600";
  const label = STAGE_LABELS[stage.name] ?? stage.name;
  return (
    <div className="rounded-md border border-white/10 bg-[var(--graphite-canvas)] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-xs text-[var(--graphite-text-body)]">
          <span className={cn("h-2 w-2 rounded-full", dot)} />
          <span className="font-medium">{label}</span>
        </span>
        <span className="font-mono text-[10px] text-[var(--graphite-muted)]">
          {stage.status}{stage.elapsed_s ? ` · ${stage.elapsed_s.toFixed(1)}s` : ""}
        </span>
      </div>
      {stage.detail ? <p className="mt-1.5 pl-4 text-[11px] text-zinc-400">{stage.detail}</p> : null}
      {stage.error ? <p className="mt-1 pl-4 text-[11px] text-[var(--graphite-muted)]">{stage.error}</p> : null}
    </div>
  );
}
