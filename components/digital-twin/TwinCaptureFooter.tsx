"use client";

import {
  IconArrowRight,
  IconPhoto,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconVideo,
} from "@tabler/icons-react";
import { twinAccent } from "@/lib/digital-twin/twin-accent";

type CaptureMode = "photo_burst" | "video_walk";

type Props = {
  mode: CaptureMode;
  recording: boolean;
  paused: boolean;
  isStreaming: boolean;
  photoCount: number;
  videoSeconds: number;
  onModeChange: (mode: CaptureMode) => void;
  onBurst: () => void;
  onCancel: () => void;
  onRecordToggle: () => void;
  onStopRecording: () => void;
  onStartRecording: () => void;
  onFinish: () => void;
};

export function TwinCaptureFooter({
  mode,
  recording,
  paused,
  isStreaming,
  photoCount,
  videoSeconds,
  onModeChange,
  onBurst,
  onCancel,
  onRecordToggle,
  onStopRecording,
  onStartRecording,
  onFinish,
}: Props) {
  return (
    <footer className="relative z-30 shrink-0 border-t border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] px-4 pb-[max(calc(0.75rem+env(safe-area-inset-bottom)),1rem)] pt-3 backdrop-blur-xl">
      <div className="mb-3 flex gap-2">
        {(["photo_burst", "video_walk"] as const).map((entry) => {
          const active = mode === entry;
          return (
            <button
              key={entry}
              type="button"
              onClick={() => onModeChange(entry)}
              className={`flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition active:scale-[0.99] ${
                active
                  ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_14%,transparent)] text-[var(--twin360-blue)]"
                  : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)]"
              }`}
            >
              {entry === "photo_burst" ? (
                <IconPhoto className="h-4 w-4" stroke={1.75} />
              ) : (
                <IconVideo className="h-4 w-4" stroke={1.75} />
              )}
              {entry === "photo_burst" ? "Photo burst" : "Video walk"}
            </button>
          );
        })}
      </div>

      {mode === "photo_burst" ? (
        <div className="flex flex-col items-center">
          <p className="mb-2 text-[10px] font-semibold tracking-wide text-[var(--graphite-muted)]">
            Tap shutter for each frame · walk the perimeter slowly
          </p>
          <button
            type="button"
            disabled={!isStreaming}
            onClick={onBurst}
            className="relative flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border-[3px] border-[color-mix(in_srgb,var(--twin360-blue)_55%,transparent)] bg-[var(--twin360-blue)] shadow-[var(--mobile-app-card-glow-info)] transition active:scale-95 disabled:opacity-50"
            aria-label="Capture photo"
          >
            <span className="h-[3.25rem] w-[3.25rem] rounded-full border-2 border-[color-mix(in_srgb,var(--graphite-canvas)_35%,transparent)] bg-[color-mix(in_srgb,white_22%,var(--twin360-blue))]" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            className={`min-h-14 min-w-[4.5rem] rounded-xl px-3 text-xs font-bold ${twinAccent.buttonDanger}`}
          >
            Cancel
          </button>
          {recording ? (
            <>
              <button
                type="button"
                onClick={onRecordToggle}
                className={`inline-flex min-h-14 min-w-14 items-center justify-center rounded-xl border ${twinAccent.button}`}
                aria-label={paused ? "Resume recording" : "Pause recording"}
              >
                {paused ? (
                  <IconPlayerPlay className="h-5 w-5" stroke={1.75} />
                ) : (
                  <IconPlayerPause className="h-5 w-5" stroke={1.75} />
                )}
              </button>
              <button
                type="button"
                onClick={onStopRecording}
                className="inline-flex min-h-14 min-w-14 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] text-[var(--graphite-text-header)]"
                aria-label="Stop recording"
              >
                <IconPlayerStop className="h-5 w-5" stroke={1.75} />
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!isStreaming}
              onClick={onStartRecording}
              className="relative flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border-[3px] border-[color-mix(in_srgb,var(--twin360-blue)_55%,transparent)] bg-[var(--twin360-blue)] shadow-[var(--mobile-app-card-glow-info)] transition active:scale-95 disabled:opacity-50"
              aria-label="Start recording"
            >
              <span className="h-[3.25rem] w-[3.25rem] rounded-full border-2 border-[color-mix(in_srgb,var(--graphite-canvas)_35%,transparent)] bg-[color-mix(in_srgb,white_22%,var(--twin360-blue))]" />
            </button>
          )}
        </div>
      )}

      {(photoCount > 0 || videoSeconds > 0) && (
        <button
          type="button"
          onClick={onFinish}
          className={`mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold ${twinAccent.button}`}
        >
          <IconArrowRight className="h-4 w-4" stroke={1.75} />
          Continue to submission
        </button>
      )}
    </footer>
  );
}
