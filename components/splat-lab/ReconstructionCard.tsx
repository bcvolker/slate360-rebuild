"use client";

import { Eye } from "lucide-react";
import { StageCard, stageDot } from "@/components/splat-lab/StageCard";
import { cn } from "@/lib/utils";
import type { SplatLabJob, SplatLabStageRecord } from "@/lib/splat-lab/job-store";

const SUB_LABELS: Record<string, string> = {
  "sfm.features": "Feature Extraction",
  "sfm.matching": "Feature Matching",
  "sfm.mapping": "Sparse Model",
};

export function ReconstructionCard({
  job,
  onViewSfm,
  onRerun,
}: {
  job: SplatLabJob | null;
  onViewSfm?: () => void;
  onRerun?: () => void;
}) {
  const stages = job?.stages ?? [];
  const outer = stages.find((s) => s.name === "sfm");
  const sub = ["sfm.features", "sfm.matching", "sfm.mapping"]
    .map((name) => stages.find((s) => s.name === name))
    .filter(Boolean) as SplatLabStageRecord[];
  const stats = (job?.manifest as { stats?: Record<string, unknown> } | undefined)?.stats;
  const canView = outer?.status === "done" || job?.hasSfmPreview;

  return (
    <StageCard
      index={2}
      title="Reconstruction"
      stage={outer}
      onRerun={onRerun}
      actions={
        canView && onViewSfm ? (
          <button onClick={onViewSfm} className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--twin360-blue)]">
            <Eye className="size-3" /> View SfM
          </button>
        ) : null
      }
    >
      {sub.length > 0 ? (
        <div className="space-y-1.5">
          {sub.map((s) => (
            <div key={s.name} className="flex items-center justify-between rounded-md border border-white/10 bg-[var(--graphite-canvas)] px-2.5 py-1.5">
              <span className="inline-flex items-center gap-2 text-xs text-[var(--graphite-text-body)]">
                <span className={cn("size-1.5 rounded-full", stageDot(s.status))} />
                {SUB_LABELS[s.name] ?? s.name}
              </span>
              <span className="font-mono text-[10px] text-[var(--graphite-muted)]">
                {s.status}{s.elapsed_s ? ` · ${s.elapsed_s.toFixed(0)}s` : ""}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {stats ? (
        <p className="mt-2 font-mono text-[10px] text-[var(--graphite-muted)]">
          {String(stats.registered ?? "—")} / {String(stats.total ?? "—")} registered · {String(stats.points ?? "—")} points
        </p>
      ) : null}
    </StageCard>
  );
}
