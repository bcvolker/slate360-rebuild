"use client";

import { X } from "lucide-react";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import type { PlanViewerPin } from "@/components/site-walk/capture/PlanPin";

type Props = {
  open: boolean;
  pin: PlanViewerPin | null;
  item: CaptureItemRecord | null;
  onClose: () => void;
  onOpenDetails: () => void;
};

export function CapturePlanPinDetailSheet({ open, pin, item, onClose, onOpenDetails }: Props) {
  if (!open || !pin) return null;

  const thumbUrl = item ? getCaptureImageUrl(item) : null;
  const noteSnippet = item?.description?.trim() || item?.title?.trim() || "No note yet";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[2000] flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <div
        className="pointer-events-auto w-full max-w-sm rounded-[1.25rem] border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] p-4 text-left shadow-2xl backdrop-blur-xl"
        data-capture-chrome="plan-pin-detail-sheet"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-[var(--twin360-blue)]">
              Stop {pin.label}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--graphite-text-body)]">{noteSnippet}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--graphite-muted)] hover:bg-white/5"
            aria-label="Close pin details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            className="mt-3 aspect-[4/3] w-full rounded-lg border border-[var(--mobile-app-card-border)] object-cover"
          />
        ) : (
          <div className="mt-3 flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed border-[var(--mobile-app-card-border)] text-xs text-[var(--graphite-muted)]">
            No capture yet
          </div>
        )}
        <button
          type="button"
          onClick={onOpenDetails}
          disabled={!item}
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--twin360-blue)] text-sm font-semibold text-[var(--graphite-canvas)] disabled:opacity-40"
        >
          Open details
        </button>
      </div>
    </div>
  );
}
