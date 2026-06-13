"use client";

import { Camera, ChevronLeft, ChevronRight, Video, X } from "lucide-react";
import type { TwinCaptureClipReview } from "@/lib/digital-twin/twin-capture-pending-session";
import { classifyTwinMedia } from "@/lib/digital-twin/twin-review-media";
import { formatTwinReviewDuration } from "@/lib/digital-twin/twin-review-format";
import { TwinSubmitGlassCard } from "./TwinSubmitGlassCard";
import { twinSubmitTokens } from "./twin-submit-tokens";

type Props = {
  clips: TwinCaptureClipReview[];
  totalDurationSeconds: number;
  onRemoveClip: (clipId: string) => void;
  onReorderClip: (clipId: string, direction: "left" | "right") => void;
  onAddMoreMedia: () => void;
  onReturnToCapture: () => void;
};

function clipBadgeLabel(clip: TwinCaptureClipReview): string {
  const category = clip.files[0] ? classifyTwinMedia(clip.files[0]) : null;
  if (category === "360_photo" || category === "360_video") return "360 Photo";
  if (clip.mode === "video") return "Drone";
  return "360 Photo";
}

export function TwinSubmitStepClips({
  clips,
  totalDurationSeconds,
  onRemoveClip,
  onReorderClip,
  onAddMoreMedia,
  onReturnToCapture,
}: Props) {
  const canRemove = clips.length > 1;

  if (!clips.length) {
    return (
      <TwinSubmitGlassCard dataAttr="clips-empty">
        <p className={twinSubmitTokens.bodyText}>No clips captured yet — return to capture.</p>
        <button type="button" onClick={onReturnToCapture} className={`${twinSubmitTokens.primaryCta} mt-4`}>
          Return to capture
        </button>
      </TwinSubmitGlassCard>
    );
  }

  return (
    <div className="space-y-4" data-twin-submit="step-clips">
      <TwinSubmitGlassCard
        title={`${clips.length} clip${clips.length === 1 ? "" : "s"} · ${formatTwinReviewDuration(totalDurationSeconds)}`}
      >
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {clips.map((clip, index) => (
            <div key={clip.id} className="relative flex w-[88px] shrink-0 flex-col gap-1.5">
              <span className="relative flex h-[72px] w-full items-center justify-center overflow-hidden rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)]">
                {clip.thumbnailUrl ? (
                  <img src={clip.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : clip.mode === "video" ? (
                  <Video className="h-5 w-5 text-[var(--twin360-blue)]" />
                ) : (
                  <Camera className="h-5 w-5 text-[var(--twin360-blue)]" />
                )}
                {canRemove ? (
                  <button
                    type="button"
                    onClick={() => onRemoveClip(clip.id)}
                    className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas)] text-[var(--graphite-text-header)]"
                    aria-label="Remove clip"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </span>
              <span className={twinSubmitTokens.badgeChip}>{clipBadgeLabel(clip)}</span>
              <span className="text-center font-mono text-[10px] font-semibold text-[var(--graphite-muted)]">
                {formatTwinReviewDuration(clip.durationSeconds)}
              </span>
              {clips.length > 1 ? (
                <div className="flex justify-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => onReorderClip(clip.id, "left")}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)] disabled:opacity-30"
                    aria-label="Move clip earlier"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === clips.length - 1}
                    onClick={() => onReorderClip(clip.id, "right")}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)] disabled:opacity-30"
                    aria-label="Move clip later"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </TwinSubmitGlassCard>

      <button type="button" onClick={onAddMoreMedia} className={twinSubmitTokens.secondaryCta}>
        Add more media
      </button>
    </div>
  );
}