"use client";

import { useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SplatViewerCore } from "@/components/digital-twin/splat-viewer-core";
import { SfmViewer } from "@/components/splat-lab/SfmViewer";
import { LiveViewHud } from "@/components/splat-lab/LiveViewHud";
import { PublishToPortal } from "@/components/splat-lab/PublishToPortal";
import type { SplatLabJob, SplatLabStageRecord } from "@/lib/splat-lab/job-store";

export function SplatLabProgress({ job, jobId }: { job: SplatLabJob | null; jobId: string }) {
  const status = job?.status ?? "queued";
  const stages = job?.stages ?? [];
  const hasModel = Boolean(job?.modelPath);
  const modelUrl = hasModel ? `/api/splat-lab/jobs/${jobId}/model` : null;
  const [showSfm, setShowSfm] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const trainRunning = stages.some((s) => s.name === "train" && s.status === "running");

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">Pipeline</p>
          <StatusPill status={status} />
        </div>
        <div className="mt-3 space-y-2">
          {stages.length === 0 ? <p className="text-xs text-[var(--graphite-muted)]">Starting…</p> : stages.map((s) => (
            <StageRow key={s.name} stage={s}
              onViewSfm={s.name === "sfm" && (s.status === "done" || job?.hasSfmPreview) ? () => setShowSfm(true) : undefined}
              onLive={s.name === "train" ? () => setShowLive(true) : undefined} />
          ))}
        </div>
        {job?.error ? <p className="mt-3 text-xs text-red-400">{job.error}</p> : null}
        {hasModel ? <PublishToPortal jobId={jobId} /> : null}
      </div>

      <div className="relative min-h-[360px] rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur">
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">Preview</p>
          {hasModel ? (
            <a href={modelUrl ?? "#"} download className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-[var(--graphite-muted)] hover:text-white">
              <Download className="size-3" /> Export
            </a>
          ) : null}
        </div>
        {showSfm ? <SfmViewer jobId={jobId} onClose={() => setShowSfm(false)} /> : null}
        {showViewer ? (
          <iframe title="Nerfstudio live viewer" src="http://127.0.0.1:7007" className="absolute inset-0 z-[5] h-full w-full rounded-xl border-0 bg-black" />
        ) : modelUrl ? (
          <SplatViewerCore src={modelUrl} className="rounded-xl" />
        ) : (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-2 p-6 text-center">
            {status === "running" || status === "queued" ? (
              <>
                <Loader2 className="size-6 animate-spin text-[var(--twin360-blue)]" />
                <p className="text-xs text-[var(--graphite-muted)]">Waiting for a trained model…</p>
              </>
            ) : (
              <p className="text-xs text-[var(--graphite-muted)]">No model produced. Run the pipeline to begin.</p>
            )}
          </div>
        )}
        {(showLive || trainRunning) ? (
          <LiveViewHud telemetry={job?.telemetry ?? null} showViewer={showViewer} onToggleViewer={() => setShowViewer((v) => !v)} />
        ) : null}
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

function StageRow({ stage, onViewSfm, onLive }: { stage: SplatLabStageRecord; onViewSfm?: () => void; onLive?: () => void }) {
  const dot = stage.status === "done" ? "bg-[var(--graphite-primary)]"
    : stage.status === "failed" ? "bg-red-500"
    : stage.status === "blocked" ? "bg-[var(--graphite-muted)]"
    : stage.status === "running" ? "bg-[var(--twin360-blue)]"
    : "bg-zinc-600";
  return (
    <div className="rounded-md border border-white/10 bg-[var(--graphite-canvas)] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-xs text-[var(--graphite-text-body)]">
          <span className={cn("h-2 w-2 rounded-full", dot)} />
          <span className="font-medium">{STAGE_LABELS[stage.name] ?? stage.name}</span>
        </span>
        <span className="flex items-center gap-2">
          {onViewSfm ? (
            <button onClick={onViewSfm} className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--twin360-blue)]">
              <Eye className="size-3" /> View
            </button>
          ) : null}
          {onLive ? (
            <button onClick={onLive} className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--twin360-blue)]">
              <Eye className="size-3" /> Live View
            </button>
          ) : null}
          <span className="font-mono text-[10px] text-[var(--graphite-muted)]">
            {stage.status}{stage.elapsed_s ? ` · ${stage.elapsed_s.toFixed(1)}s` : ""}
          </span>
        </span>
      </div>
      {stage.detail ? <p className="mt-1.5 line-clamp-3 pl-4 text-[11px] text-zinc-400">{stage.detail}</p> : null}
      {stage.error ? <p className="mt-1 pl-4 text-[11px] text-[var(--graphite-muted)]">{stage.error}</p> : null}
    </div>
  );
}
