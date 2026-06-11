"use client";

import { Camera, Video, X } from "lucide-react";
import type { TwinCaptureClipReview } from "@/lib/digital-twin/twin-capture-pending-session";
import { formatTwinReviewDuration } from "@/lib/digital-twin/twin-review-format";

type Props = {
  clips: TwinCaptureClipReview[];
  totalDurationSeconds: number;
  frameCount: number;
  onRemoveClip?: (clipId: string) => void;
};

export function TwinCaptureReviewClips({
  clips,
  totalDurationSeconds,
  frameCount,
  onRemoveClip,
}: Props) {
  const canRemove = Boolean(onRemoveClip) && clips.length > 1;

  return (
    <section className="space-y-2">
      <p className="text-sm font-medium text-[var(--graphite-text-body)]">
        Capture · {clips.length} clips combined · {formatTwinReviewDuration(totalDurationSeconds)} ·{" "}
        {frameCount} frames
      </p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
        {clips.map((clip) => (
          <div key={clip.id} className="relative flex shrink-0 flex-col items-center gap-1">
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
            {canRemove ? (
              <button
                type="button"
                onClick={() => onRemoveClip?.(clip.id)}
                className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas)] text-[var(--graphite-text-header)] transition active:scale-[0.95]"
                aria-label="Remove clip"
                data-twin-review="remove-clip"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
            <span className="font-mono text-[10px] font-semibold text-[var(--graphite-muted)]">
              {formatTwinReviewDuration(clip.durationSeconds)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
