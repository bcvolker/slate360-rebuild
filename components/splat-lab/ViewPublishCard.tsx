"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { SplatViewerCore } from "@/components/digital-twin/splat-viewer-core";
import { SfmViewer } from "@/components/splat-lab/SfmViewer";
import { LiveViewHud } from "@/components/splat-lab/LiveViewHud";
import { PublishToPortal } from "@/components/splat-lab/PublishToPortal";
import type { SplatLabJob } from "@/lib/splat-lab/job-store";

export function ViewPublishCard({
  job,
  jobId,
  showSfm,
  onCloseSfm,
  showLiveView,
}: {
  job: SplatLabJob | null;
  jobId: string | null;
  showSfm: boolean;
  onCloseSfm: () => void;
  showLiveView: boolean;
}) {
  const [showViewer, setShowViewer] = useState(false);
  const status = job?.status ?? "queued";
  const hasModel = Boolean(job?.modelPath);
  const modelUrl = hasModel && jobId ? `/api/splat-lab/jobs/${jobId}/model` : null;
  const trainRunning = job?.stages.some((s) => s.name === "train" && s.status === "running");

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">View / Publish</p>
      </div>
      <div className="relative mt-2 min-h-[360px] overflow-hidden rounded-xl border border-white/10 bg-[var(--graphite-canvas)]">
        {showSfm && jobId ? <SfmViewer jobId={jobId} onClose={onCloseSfm} /> : null}
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
              <p className="text-xs text-[var(--graphite-muted)]">No model produced yet. Run All to begin.</p>
            )}
          </div>
        )}
        {(showLiveView || trainRunning) ? (
          <LiveViewHud telemetry={job?.telemetry ?? null} showViewer={showViewer} onToggleViewer={() => setShowViewer((v) => !v)} />
        ) : null}
      </div>
      {hasModel && jobId ? <PublishToPortal jobId={jobId} /> : null}
    </div>
  );
}
