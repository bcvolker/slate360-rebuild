"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { CAPTURE_PLAN_CANVAS_CHROME } from "@/lib/site-walk/capture-plan-canvas-tokens";
import { CAPTURE_V2_LAYERS } from "../layers";

type Props = {
  hidden?: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export function CapturePlanBottomRail({
  hidden = false,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
}: Props) {
  if (hidden) return null;

  const safeBottom = "env(safe-area-inset-bottom)";
  const buttonSize = CAPTURE_PLAN_CANVAS_CHROME.planRailSideButtonPx;

  return (
    <div className={`${CAPTURE_V2_LAYERS.fastTrack} pointer-events-none absolute inset-x-0 bottom-0 z-30`}>
      <div
        className="pointer-events-auto absolute inset-x-0"
        style={{
          bottom: `calc(${CAPTURE_PLAN_CANVAS_CHROME.railLabelBottomPx}px + ${safeBottom})`,
          paddingLeft: CAPTURE_PLAN_CANVAS_CHROME.railSideInsetPx,
          paddingRight: CAPTURE_PLAN_CANVAS_CHROME.railSideInsetPx,
        }}
        data-capture-chrome="plan-bottom-rail"
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-end">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={onPrev}
            data-capture-chrome="plan-prev-sheet"
            className="inline-flex items-center justify-center justify-self-start rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] text-[var(--graphite-text-header)] backdrop-blur-md transition active:scale-[0.98] disabled:opacity-40"
            style={{ width: buttonSize, height: buttonSize }}
            aria-label="Previous sheet"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <p className="justify-self-center pb-2 text-[11px] font-medium text-[var(--graphite-muted)]">Sheet</p>

          <button
            type="button"
            disabled={!canGoNext}
            onClick={onNext}
            data-capture-chrome="plan-next-sheet"
            className="inline-flex items-center justify-center justify-self-end rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] text-[var(--graphite-text-header)] backdrop-blur-md transition active:scale-[0.98] disabled:opacity-40"
            style={{ width: buttonSize, height: buttonSize }}
            aria-label="Next sheet"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
