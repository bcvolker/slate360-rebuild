"use client";

import Link from "next/link";
import { Camera, FileText, Mic } from "lucide-react";
import {
  formatVoiceMemoDuration,
  type WalkReviewStopCardModel,
} from "./capture-v2-walk-review-card-model";
import { walkReviewTokens } from "./capture-v2-walk-review-tokens";

type Props = {
  card: WalkReviewStopCardModel;
};

export function CaptureV2WalkReviewStopCard({ card }: Props) {
  const statusClass =
    card.statusTone === "critical"
      ? walkReviewTokens.statusCritical
      : card.statusTone === "resolved"
        ? walkReviewTokens.statusResolved
        : walkReviewTokens.statusOpen;

  return (
    <Link
      href={card.href}
      className={`block overflow-hidden ${walkReviewTokens.cardSurface} p-2 transition active:scale-[0.99]`}
      data-walk-review="stop-card"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas)]">
        {card.thumbUrl ? (
          <img src={card.thumbUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--graphite-muted)]">
            <Camera className="h-5 w-5" />
          </div>
        )}
        <span className={walkReviewTokens.stopOverlay}>{String(card.stopNumber).padStart(2, "0")}</span>
        {(card.voiceMemoCount > 0 || card.extraAngleCount > 0) && (
          <div className="absolute bottom-1.5 left-1.5 flex flex-wrap gap-1">
            {card.voiceMemoCount > 0 ? (
              <span className={walkReviewTokens.badge}>
                <Mic className="h-3 w-3" />
                {formatVoiceMemoDuration(card.voiceMemoDurationMs)}
              </span>
            ) : null}
            {card.extraAngleCount > 0 ? (
              <span className={walkReviewTokens.badge}>+{card.extraAngleCount} angles</span>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-2 space-y-1.5">
        <p className={walkReviewTokens.noteSnippet}>
          {card.noteSnippet.trim() ? (
            card.noteSnippet
          ) : (
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3" /> No notes added yet.
            </span>
          )}
        </p>
        <span className={statusClass}>{card.statusLabel}</span>
      </div>
    </Link>
  );
}
