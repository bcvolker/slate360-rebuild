"use client";

import { Camera, Video } from "lucide-react";
import type { TwinCaptureClipReview } from "@/lib/digital-twin/twin-capture-pending-session";
import { formatTwinReviewDuration } from "@/lib/digital-twin/twin-review-format";

type Props = {
  clips: TwinCaptureClipReview[];
  totalDurationSeconds: number;
  frameCount: number;
};

export function TwinCaptureReviewClips({ clips, totalDurationSeconds, frameCount }: Props) {
  return (
    <section className="space-y-2">
      <p className="text-sm font-medium text-[var(--graphite-text-body)]">
        Capture · {clips.length} clips combined · {formatTwinReviewDuration(totalDurationSeconds)} ·{" "}
        {frameCount} frames
      </p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {clips.map((clip) => (
          <div key={clip.id} className="flex shrink-0 flex-col items-center gap-1">
            <span
              className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)]"
            >
              {clip.thumbnailUrl ? (
                <img src={clip.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : clip.mode === "video" ? (
                <Video className="h-4 w-4 text-[var(--twin360-blue)]" />
              ) : (
                <Camera className="h-4 w-4 text-[var(--twin360-blue)]" />
              )}
            </span>
            <span className="font-mono text-[10px] font-semibold text-[var(--graphite-muted)]">
              {formatTwinReviewDuration(clip.durationSeconds)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
