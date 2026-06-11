"use client";

import { Ghost } from "lucide-react";
import { CAPTURE_CANVAS_CHROME } from "./capture-canvas-chrome-layout";
import { captureCanvasGlass } from "./capture-canvas-glass-tokens";

type Props = {
  hidden?: boolean;
  busy?: boolean;
  ghostOn: boolean;
  ghostAvailable: boolean;
  onGhostTap: () => void;
};

/** Ghost overlay toggle pinned top-right under the top bar (live state only). */
export function CaptureCanvasGhostButton({
  hidden = false,
  busy = false,
  ghostOn,
  ghostAvailable,
  onGhostTap,
}: Props) {
  if (hidden) return null;

  const BTN = CAPTURE_CANVAS_CHROME.railButtonSizePx;
  const top = `calc(max(env(safe-area-inset-top), ${CAPTURE_CANVAS_CHROME.topInsetPx}px) + ${CAPTURE_CANVAS_CHROME.topBarHeightPx}px + ${CAPTURE_CANVAS_CHROME.ghostButtonTopGapPx}px)`;

  return (
    <div
      className="pointer-events-auto absolute z-20 flex flex-col items-center"
      style={{
        top,
        right: CAPTURE_CANVAS_CHROME.toolRailRightPx,
        gap: CAPTURE_CANVAS_CHROME.labelGapPx,
      }}
      data-capture-chrome="ghost-stack"
    >
      <button
        type="button"
        disabled={busy || !ghostAvailable}
        onClick={(event) => {
          event.stopPropagation();
          onGhostTap();
        }}
        data-capture-chrome="ghost-button"
        className={`inline-flex items-center justify-center rounded-xl transition active:scale-[0.98] disabled:opacity-50 backdrop-blur-md ${
          ghostOn
            ? "border border-[var(--accent-border-green)] bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-primary)] ring-2 ring-[var(--accent-border-green)]"
            : "border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] text-[var(--graphite-text-header)]"
        }`}
        style={{ width: BTN, height: BTN }}
        aria-pressed={ghostOn}
        aria-label={ghostOn ? "Hide ghost overlay" : "Show ghost overlay"}
      >
        <Ghost className="h-5 w-5" />
      </button>
      <span className={`${captureCanvasGlass.labelChip} text-[11px] font-medium text-[var(--graphite-text-body)]`}>
        Ghost
      </span>
    </div>
  );
}
