"use client";

import { CAPTURE_CANVAS_CHROME } from "./capture-canvas-chrome-layout";
import { captureCanvasGlass } from "./capture-canvas-glass-tokens";

type Props = {
  hidden?: boolean;
  ghostOpacity: number;
  onGhostOpacityChange: (value: number) => void;
};

/** Ghost fade control anchored under the ghost button. Session ghost shows the
 * previous shot only; the project-scoped progression picker ships with
 * walks-with-plans (pin-anchored) — see ghost-mode spec. */
export function CaptureCanvasGhostPanel({
  hidden = false,
  ghostOpacity,
  onGhostOpacityChange,
}: Props) {
  if (hidden) return null;

  const BTN = CAPTURE_CANVAS_CHROME.railButtonSizePx;
  const top = `calc(max(env(safe-area-inset-top), ${CAPTURE_CANVAS_CHROME.topInsetPx}px) + ${CAPTURE_CANVAS_CHROME.topBarHeightPx}px + ${CAPTURE_CANVAS_CHROME.ghostButtonTopGapPx}px + ${BTN + CAPTURE_CANVAS_CHROME.labelGapPx + CAPTURE_CANVAS_CHROME.labelRowPx + 8}px)`;

  return (
    <div
      className={`pointer-events-auto absolute z-20 flex w-[176px] items-center gap-2 p-2 ${captureCanvasGlass.surface} ${captureCanvasGlass.radiusMd}`}
      style={{ top, right: CAPTURE_CANVAS_CHROME.toolRailRightPx }}
      data-capture-chrome="ghost-panel"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span className="text-[11px] font-medium text-[var(--graphite-muted)]">Fade</span>
      <input
        type="range"
        min={0.1}
        max={0.6}
        step={0.05}
        value={ghostOpacity}
        onChange={(event) => onGhostOpacityChange(Number(event.target.value))}
        className="h-1 min-w-0 flex-1 cursor-pointer accent-[var(--graphite-primary)]"
        aria-label="Ghost overlay opacity"
        data-capture-chrome="ghost-opacity-slider"
      />
    </div>
  );
}
