"use client";

import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";
import { TWIN_CAPTURE_GLASS } from "./twin-capture-glass";
import type { PhotoIntervalSec, TwinCaptureMode } from "./useTwinCaptureSession";

type Props = {
  hidden?: boolean;
  mode: TwinCaptureMode;
  photoInterval: PhotoIntervalSec;
  modeLocked: boolean;
  onModeChange: (mode: TwinCaptureMode) => void;
  onCycleInterval: () => void;
};

export function TwinCaptureModeSelector({
  hidden,
  mode,
  photoInterval,
  modeLocked,
  onModeChange,
  onCycleInterval,
}: Props) {
  if (hidden) return null;

  const safeBottom = "env(safe-area-inset-bottom)";

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 z-20 flex items-center justify-center"
      style={{ bottom: `calc(${TWIN_CAPTURE_CHROME.modeSelectorBottomPx}px + ${safeBottom})` }}
      data-twin-chrome="mode-selector"
      role="tablist"
      aria-label="Capture mode"
    >
      <div className={`inline-flex items-center gap-1 p-1 ${TWIN_CAPTURE_GLASS}`}>
        {(["video", "photos"] as const).map((entry) => {
          const active = mode === entry;
          const label = entry === "video" ? "VIDEO" : "PHOTOS";
          return (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={modeLocked && !active}
              onClick={() => onModeChange(entry)}
              className={`rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide transition disabled:opacity-40 ${
                active
                  ? "bg-[color-mix(in_srgb,var(--twin360-blue)_18%,transparent)] text-[var(--twin360-blue)]"
                  : "text-[var(--graphite-muted)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {mode === "photos" ? (
        <button
          type="button"
          disabled={modeLocked}
          onClick={onCycleInterval}
          className={`ml-2 px-2 py-1 font-mono text-[10px] font-semibold tabular-nums text-[var(--twin360-blue)] disabled:opacity-40 ${TWIN_CAPTURE_GLASS}`}
          aria-label={`Photo interval ${photoInterval} seconds`}
        >
          {photoInterval}s
        </button>
      ) : null}
    </div>
  );
}
