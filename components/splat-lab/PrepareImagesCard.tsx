"use client";

import { StageCard } from "@/components/splat-lab/StageCard";
import type { SplatLabStageRecord } from "@/lib/splat-lab/job-store";
import type { SplatLabQuality } from "@/lib/splat-lab/job-types";

export function PrepareImagesCard({
  framesStage,
  maskStage,
  quality,
  onRerun,
}: {
  framesStage: SplatLabStageRecord | undefined;
  maskStage: SplatLabStageRecord | undefined;
  quality: SplatLabQuality | null | undefined;
  onRerun?: () => void;
}) {
  const detail = [framesStage?.detail, maskStage?.detail].filter(Boolean).join(" · ") || framesStage?.detail;
  const merged: SplatLabStageRecord | undefined = framesStage
    ? { ...framesStage, detail, status: maskStage?.status === "running" ? "running" : framesStage.status }
    : undefined;

  return (
    <StageCard index={1} title="Prepare Images" stage={merged} onRerun={onRerun}>
      {quality?.lowQuality ? (
        <div className="rounded-md border border-white/10 bg-[var(--graphite-canvas)] p-2.5 text-[11px] text-[var(--graphite-text-body)]">
          <span className="font-mono uppercase tracking-wide text-[var(--graphite-muted)]">Capture quality — </span>
          {quality.message}
          <span className="ml-2 font-mono text-[10px] text-zinc-500">
            (luma {quality.meanLuma}/255 · {(quality.deepShadowFraction * 100).toFixed(0)}% shadow · sharpness {quality.laplacianVariance})
          </span>
        </div>
      ) : null}
    </StageCard>
  );
}
