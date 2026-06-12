"use client";

import { ChevronLeft } from "lucide-react";
import { noteReviewTokens } from "./capture-v2-note-review-tokens";

type Props = {
  open: boolean;
  imageUrl: string | null;
  stopNumber: number;
  angleLabel?: string | null;
  onClose: () => void;
};

/** Full-size photo reference view inside the Data screen — an overlay, not a
 * navigation, so every draft (notes, memos, tracking, tags) stays mounted and
 * intact while the user checks the capture. */
export function CaptureV2NoteReviewPhotoViewer({
  open,
  imageUrl,
  stopNumber,
  angleLabel = null,
  onClose,
}: Props) {
  if (!open || !imageUrl) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col bg-[var(--graphite-canvas)]"
      data-note-review="photo-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`Stop ${stopNumber} photo`}
    >
      <header className={`${noteReviewTokens.margin} shrink-0 pt-[max(env(safe-area-inset-top),8px)] pb-2`}>
        <div className={`flex h-11 items-center gap-2 ${noteReviewTokens.glassBar} ${noteReviewTokens.glassBarRadius} px-2`}>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-text-header)] active:scale-[0.98]"
            aria-label="Back to details"
            data-note-review="photo-viewer-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className={`min-w-0 flex-1 text-center ${noteReviewTokens.monoGreenLabel}`}>
            STOP {stopNumber} · {angleLabel ? angleLabel.toUpperCase() : "PHOTO"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-[var(--accent-border-green)] bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] px-2.5 text-[11px] font-bold uppercase tracking-wider text-[var(--graphite-primary)] active:scale-[0.98]"
            aria-label="Return to details"
            data-note-review="photo-viewer-details"
          >
            Details
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2 pb-[max(env(safe-area-inset-bottom),8px)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={`Stop ${stopNumber} capture`} className="max-h-full max-w-full object-contain" draggable={false} />
      </div>
    </div>
  );
}
