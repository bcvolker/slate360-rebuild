"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Download, Eye } from "lucide-react";
import { StageCard } from "@/components/splat-lab/StageCard";
import { SplatOptions } from "@/components/splat-lab/SplatOptions";
import { LiveRow } from "@/components/splat-lab/LiveRow";
import type { Knobs } from "@/lib/splat-lab/clones";
import type { SplatLabJob } from "@/lib/splat-lab/job-store";

export function SplatGenerationCard({
  job,
  jobId,
  knobs,
  setKnobs,
  isLab,
  onRerun,
  onOpenLiveView,
  showLiveView,
}: {
  job: SplatLabJob | null;
  jobId: string | null;
  knobs: Knobs;
  setKnobs: (k: Knobs) => void;
  isLab: boolean;
  onRerun?: () => void;
  onOpenLiveView: () => void;
  showLiveView: boolean;
}) {
  const [showOptions, setShowOptions] = useState(false);
  const stages = job?.stages ?? [];
  const viewsStage = stages.find((s) => s.name === "views");
  const trainStage = stages.find((s) => s.name === "train");
  const exportStage = stages.find((s) => s.name === "export");
  const running = trainStage?.status === "running";
  const buildingViews = viewsStage?.status === "running";
  const done = exportStage?.status === "done" || Boolean(job?.modelPath);
  const viewCount = ((job?.manifest as Record<string, unknown> | undefined)?.viewCount as number)
    ?? (trainStage as unknown as { viewCount?: number })?.viewCount ?? 13040;
  const modelUrl = job && jobId ? `/api/splat-lab/jobs/${jobId}/model` : null;
  // Building the 16-view training set can take a long time on a big capture
  // (all 815 panoramas x 16 views for a full kitchen walk) - without this,
  // the card just says "Queued" while real work is happening underneath it.
  const displayStage = buildingViews ? viewsStage : (trainStage ?? exportStage ?? viewsStage);

  return (
    <StageCard
      index={3}
      title="Splat Generation"
      stage={displayStage}
      onRerun={onRerun}
      actions={
        <button onClick={() => setShowOptions((v) => !v)} className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--graphite-muted)] hover:text-white">
          Options {showOptions ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
      }
    >
      {showOptions ? (
        <div className="mb-3">
          <SplatOptions knobs={knobs} setKnobs={setKnobs} viewCount={viewCount} isLab={isLab} />
        </div>
      ) : null}

      {buildingViews ? (
        <div className="rounded-md border border-white/10 bg-[var(--graphite-canvas)] p-2.5">
          <p className="text-[11px] text-[var(--graphite-text-body)]">Building training views (16 per panorama)…</p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-sm bg-white/10">
            <div className="h-full bg-[var(--twin360-blue)] transition-all" style={{ width: `${Math.round((viewsStage?.progress ?? 0) * 100)}%` }} />
          </div>
        </div>
      ) : null}

      {running ? (
        <div className="space-y-2">
          <LiveRow telemetry={job?.telemetry ?? null} elapsedS={trainStage?.elapsed_s} />
          <button onClick={onOpenLiveView} className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--twin360-blue)]">
            <Eye className="size-3" /> {showLiveView ? "Hide" : "Open"} viewer :7007
          </button>
        </div>
      ) : null}

      {done && modelUrl ? (
        <a href={modelUrl} download className="mt-2 inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-[var(--graphite-muted)] hover:text-white">
          <Download className="size-3" /> Export
        </a>
      ) : null}
    </StageCard>
  );
}
