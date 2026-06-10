"use client";

import type { PhotoIntervalSec, TwinCaptureMode } from "@/hooks/useTwinCaptureSession";
import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";

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
      className="pointer-events-auto absolute inset-x-0 z-20 flex items-center justify-center gap-6"
      style={{ bottom: `calc(${TWIN_CAPTURE_CHROME.modeSelectorBottomPx}px + ${safeBottom})` }}
      role="tablist"
      aria-label="Capture mode"
    >
      {(["video", "photos"] as const).map((entry) => {
        const active = mode === entry;
        const label = entry === "video" ? "VIDEO" : "PHOTOS";
        return (
          <div key={entry} className="flex items-center gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={active}
              disabled={modeLocked && !active}
              onClick={() => onModeChange(entry)}
              className={`relative pb-1 font-mono text-xs font-semibold uppercase tracking-wide transition disabled:opacity-40 ${
                active ? "text-[var(--twin360-blue)]" : "text-[var(--graphite-muted)]"
              }`}
            >
              {label}
              {active ? (
                <span
                  className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--twin360-blue)]"
                  aria-hidden
                />
              ) : null}
            </button>
            {entry === "photos" && active ? (
              <button
                type="button"
                disabled={modeLocked}
                onClick={onCycleInterval}
                className="rounded-md border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)] px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-[var(--twin360-blue)] disabled:opacity-40"
                aria-label={`Photo interval ${photoInterval} seconds`}
              >
                {photoInterval}s
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
