"use client";

import { CAPTURE_CANVAS_CHROME } from "./capture-canvas-chrome-layout";
import { captureCanvasGlass } from "./capture-canvas-glass-tokens";

type GhostCandidate = { id: string; url: string; stopNumber: number };

type Props = {
  hidden?: boolean;
  ghostOpacity: number;
  onGhostOpacityChange: (value: number) => void;
  candidates: GhostCandidate[];
  selectedId: string | null;
  onSelectCandidate: (id: string | null) => void;
};

/** Ghost controls — opacity slider + previous-stop picker, anchored under the ghost button. */
export function CaptureCanvasGhostPanel({
  hidden = false,
  ghostOpacity,
  onGhostOpacityChange,
  candidates,
  selectedId,
  onSelectCandidate,
}: Props) {
  if (hidden) return null;

  const BTN = CAPTURE_CANVAS_CHROME.railButtonSizePx;
  const top = `calc(max(env(safe-area-inset-top), ${CAPTURE_CANVAS_CHROME.topInsetPx}px) + ${CAPTURE_CANVAS_CHROME.topBarHeightPx}px + ${CAPTURE_CANVAS_CHROME.ghostButtonTopGapPx}px + ${BTN + CAPTURE_CANVAS_CHROME.labelGapPx + CAPTURE_CANVAS_CHROME.labelRowPx + 8}px)`;
  const effectiveSelectedId = selectedId ?? candidates[0]?.id ?? null;

  return (
    <div
      className={`pointer-events-auto absolute z-20 flex w-[176px] flex-col gap-2 p-2 ${captureCanvasGlass.surface} ${captureCanvasGlass.radiusMd}`}
      style={{ top, right: CAPTURE_CANVAS_CHROME.toolRailRightPx }}
      data-capture-chrome="ghost-panel"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-2">
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
      {candidates.length > 1 ? (
        <div
          className="flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-capture-chrome="ghost-candidate-row"
        >
          {candidates.map((candidate) => {
            const selected = candidate.id === effectiveSelectedId;
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectCandidate(candidate.id);
                }}
                className={`relative shrink-0 overflow-hidden rounded-lg border transition ${
                  selected
                    ? "border-[var(--graphite-primary)] ring-1 ring-[var(--graphite-primary)]"
                    : "border-[var(--mobile-app-card-border)] opacity-75"
                }`}
                style={{ width: 44, height: 44 }}
                aria-pressed={selected}
                aria-label={`Ghost from stop ${candidate.stopNumber}`}
                data-capture-chrome="ghost-candidate"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={candidate.url} alt="" className="h-full w-full object-cover" draggable={false} />
                <span className="absolute bottom-0 right-0 rounded-tl-md bg-[color-mix(in_srgb,var(--graphite-canvas)_82%,transparent)] px-1 text-[9px] font-semibold text-[var(--graphite-text-body)]">
                  {candidate.stopNumber}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
