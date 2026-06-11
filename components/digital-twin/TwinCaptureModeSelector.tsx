"use client";

import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";
import { TWIN_CAPTURE_GLASS, TWIN_CAPTURE_HUD_TEXT } from "./twin-capture-glass";
import type { PhotoIntervalSec, TwinCaptureMode } from "./useTwinCaptureSession";

function formatRecTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  hidden?: boolean;
  mode: TwinCaptureMode;
  photoInterval: PhotoIntervalSec;
  modeLocked: boolean;
  isRecording?: boolean;
  recSeconds?: number;
  onModeChange: (mode: TwinCaptureMode) => void;
  onCycleInterval: () => void;
};

export function TwinCaptureModeSelector({
  hidden,
  mode,
  photoInterval,
  modeLocked,
  isRecording = false,
  recSeconds = 0,
  onModeChange,
  onCycleInterval,
}: Props) {
  if (hidden) return null;

  const safeBottom = "env(safe-area-inset-bottom)";

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex items-center justify-center"
      style={{ bottom: `calc(${TWIN_CAPTURE_CHROME.modeSelectorBottomPx}px + ${safeBottom})` }}
      data-twin-chrome="mode-selector"
      role={isRecording ? undefined : "tablist"}
      aria-label={isRecording ? undefined : "Capture mode"}
    >
      {isRecording ? (
        <span
          className={`pointer-events-none whitespace-nowrap px-2.5 py-1 font-mono text-[13px] font-semibold tracking-wide text-white ${TWIN_CAPTURE_GLASS}`}
          data-twin-chrome="rec-timer-chip"
          aria-live="polite"
        >
          <span className="text-[var(--destructive)]">●</span> REC {formatRecTimer(recSeconds)}
        </span>
      ) : (
        <div className="pointer-events-auto inline-flex items-center gap-1">
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
                  onClick={(event) => {
                    event.stopPropagation();
                    onModeChange(entry);
                  }}
                  className={`rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide transition disabled:opacity-40 ${
                    active
                      ? "bg-[color-mix(in_srgb,var(--twin360-blue)_18%,transparent)] text-[var(--twin360-blue)]"
                      : TWIN_CAPTURE_HUD_TEXT
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
              onClick={(event) => {
                event.stopPropagation();
                onCycleInterval();
              }}
              className={`ml-2 px-2 py-1 font-mono text-[10px] font-semibold tabular-nums text-[var(--twin360-blue)] disabled:opacity-40 ${TWIN_CAPTURE_GLASS}`}
              aria-label={`Photo interval ${photoInterval} seconds`}
            >
              {photoInterval}s
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
