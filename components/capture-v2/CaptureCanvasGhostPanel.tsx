"use client";

import { CAPTURE_CANVAS_CHROME } from "./capture-canvas-chrome-layout";
import { captureCanvasGlass } from "./capture-canvas-glass-tokens";

/** Selectable vicinity (feet). 5ft is the most precise; GPS auto-widens when weak. */
const VICINITY_OPTIONS_FT = [5, 15, 30] as const;

type Props = {
  hidden?: boolean;
  ghostOpacity: number;
  onGhostOpacityChange: (value: number) => void;
  /** SW-006: user-selectable vicinity radius in feet (default 5). */
  radiusFt?: number;
  onRadiusFtChange?: (ft: number) => void;
  /** SW-006: true when GPS accuracy forced the query wider than requested. */
  weakGps?: boolean;
  /** SW-006: the radius actually used (feet) — shown when GPS widened it. */
  effectiveRadiusFt?: number;
};

/** Ghost fade + vicinity control anchored under the ghost button. Project-scoped
 * progression picker (pin-anchored on plan walks) — see ghost-mode spec. */
export function CaptureCanvasGhostPanel({
  hidden = false,
  ghostOpacity,
  onGhostOpacityChange,
  radiusFt,
  onRadiusFtChange,
  weakGps = false,
  effectiveRadiusFt,
}: Props) {
  if (hidden) return null;

  const BTN = CAPTURE_CANVAS_CHROME.railButtonSizePx;
  const top = `calc(max(env(safe-area-inset-top), ${CAPTURE_CANVAS_CHROME.topInsetPx}px) + ${CAPTURE_CANVAS_CHROME.topBarHeightPx}px + ${CAPTURE_CANVAS_CHROME.ghostButtonTopGapPx}px + ${BTN + CAPTURE_CANVAS_CHROME.labelGapPx + CAPTURE_CANVAS_CHROME.labelRowPx + 8}px)`;

  const showVicinity = typeof onRadiusFtChange === "function";

  return (
    <div
      className={`pointer-events-auto absolute z-20 flex w-[200px] flex-col gap-2 p-2 ${captureCanvasGlass.surface} ${captureCanvasGlass.radiusMd}`}
      style={{ top, right: CAPTURE_CANVAS_CHROME.toolRailRightPx }}
      data-capture-chrome="ghost-panel"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {showVicinity ? (
        <div className="flex items-center gap-1.5" data-capture-chrome="ghost-vicinity">
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--graphite-muted)]">Near</span>
          {VICINITY_OPTIONS_FT.map((ft) => {
            const active = (radiusFt ?? 5) === ft;
            return (
              <button
                key={ft}
                type="button"
                onClick={() => onRadiusFtChange?.(ft)}
                className={`flex-1 rounded-full px-1.5 py-1 text-[10px] font-semibold ${
                  active
                    ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-primary)]"
                    : "text-[var(--graphite-muted)]"
                }`}
                style={active ? { border: "1px solid var(--graphite-primary)" } : { border: "1px solid var(--mobile-app-card-border)" }}
              >
                {ft} ft
              </button>
            );
          })}
        </div>
      ) : null}

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

      {weakGps ? (
        <p className="text-[10px] leading-snug text-[#FFB84D]" data-capture-chrome="ghost-weak-gps">
          GPS weak — showing nearby within {effectiveRadiusFt ?? "—"} ft
        </p>
      ) : null}
    </div>
  );
}
