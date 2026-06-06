"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  FlipHorizontal,
  ImageIcon,
  Pause,
  Play,
  Square,
  Video,
  X,
} from "lucide-react";
import { useCamera } from "@/lib/hooks/useCamera";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { formatTwinBytes } from "@/lib/dev/mock-twin-capture";
import { TwinCaptureLiveCamera } from "./TwinCaptureLiveCamera";

type CaptureMode = "photo_burst" | "video_walk";

type Props = {
  spaceName?: string;
  onCancel?: () => void;
  onFinish?: (stats: { photoCount: number; videoSeconds: number; estimatedBytes: number }) => void;
};

const PHOTO_EST_BYTES = 2_400_000;
const VIDEO_EST_BYTES_PER_SEC = 1_850_000;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TwinCaptureScreen({
  spaceName = "Lobby — Level 1",
  onCancel,
  onFinish,
}: Props) {
  const camera = useCamera();
  const [mode, setMode] = useState<CaptureMode>("photo_burst");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [photoCount, setPhotoCount] = useState(0);
  const [videoSeconds, setVideoSeconds] = useState(0);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [topCollapsed, setTopCollapsed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const estimatedBytes =
    photoCount * PHOTO_EST_BYTES + videoSeconds * VIDEO_EST_BYTES_PER_SEC;
  const showGuidance = mode === "video_walk" && recording && !paused;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  useEffect(() => {
    if (mode !== "video_walk" || !recording || paused) {
      stopTimer();
      return;
    }
    timerRef.current = setInterval(() => {
      setVideoSeconds((value) => value + 1);
    }, 1000);
    return stopTimer;
  }, [mode, paused, recording, stopTimer]);

  const handleFlip = useCallback(async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    camera.stopCamera();
    await camera.startCamera(next);
  }, [camera, facingMode]);

  const handleBurst = useCallback(() => {
    if (!camera.isStreaming) return;
    const result = camera.capturePhoto();
    if (!result) return;
    setPhotoCount((value) => value + 1);
  }, [camera]);

  const handleRecordToggle = useCallback(() => {
    if (!recording) {
      setRecording(true);
      setPaused(false);
      return;
    }
    if (paused) {
      setPaused(false);
      return;
    }
    setPaused(true);
  }, [paused, recording]);

  const handleStopRecording = useCallback(() => {
    setRecording(false);
    setPaused(false);
    stopTimer();
  }, [stopTimer]);

  const handleCancel = useCallback(() => {
    stopTimer();
    camera.stopCamera();
    onCancel?.();
  }, [camera, onCancel, stopTimer]);

  const handleFinish = useCallback(() => {
    stopTimer();
    onFinish?.({ photoCount, videoSeconds, estimatedBytes });
  }, [estimatedBytes, onFinish, photoCount, stopTimer, videoSeconds]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--graphite-canvas)] touch-manipulation select-none">
      {!topCollapsed && (
        <header className="relative z-30 flex shrink-0 items-center gap-2 border-b border-[var(--mobile-app-card-border)] px-3 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)]">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_82%,transparent)] text-[var(--graphite-text-header)] backdrop-blur-md transition active:scale-[0.98]"
            aria-label="Cancel capture"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1 rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] px-3 py-2 text-center backdrop-blur-md">
            <p className="truncate text-xs font-bold text-[var(--graphite-text-header)]">
              {spaceName}
            </p>
            <p className={`truncate text-[10px] font-semibold ${twinAccent.text}`}>
              {photoCount} photos · {formatTimer(videoSeconds)} · {formatTwinBytes(estimatedBytes)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleFlip()}
            disabled={!camera.isStreaming}
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_82%,transparent)] text-[var(--graphite-text-header)] backdrop-blur-md transition active:scale-[0.98] disabled:opacity-40"
            aria-label="Flip camera"
          >
            <FlipHorizontal className="h-5 w-5" />
          </button>
        </header>
      )}

      <div
        role="button"
        tabIndex={0}
        className="relative min-h-0 flex-1 overflow-hidden"
        onClick={() => setTopCollapsed((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setTopCollapsed((value) => !value);
          }
        }}
        aria-label="Toggle capture chrome"
      >
        <TwinCaptureLiveCamera camera={camera} facingMode={facingMode} />

        {showGuidance && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
            <p className="rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] px-4 py-2 text-center text-xs font-bold tracking-wide text-[var(--graphite-text-header)] backdrop-blur-md">
              Move slowly — keep the scene in frame
            </p>
          </div>
        )}

        {recording && (
          <div className="pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-2 rounded-xl border border-red-500/30 bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] px-3 py-1.5 backdrop-blur-md">
            <span
              className={`h-2.5 w-2.5 rounded-full ${paused ? "bg-[var(--graphite-muted)]" : "animate-pulse bg-red-500"}`}
              aria-hidden
            />
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-200">
              {paused ? "Paused" : "Recording"}
            </span>
          </div>
        )}
      </div>

      <footer className="relative z-30 shrink-0 border-t border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] px-4 pb-[max(calc(0.75rem+env(safe-area-inset-bottom)),1rem)] pt-3 backdrop-blur-xl">
        <div className="mb-3 flex gap-2">
          {(["photo_burst", "video_walk"] as const).map((entry) => {
            const active = mode === entry;
            return (
              <button
                key={entry}
                type="button"
                onClick={() => {
                  if (recording) handleStopRecording();
                  setMode(entry);
                }}
                className={`flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition active:scale-[0.99] ${
                  active
                    ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_14%,transparent)] text-[var(--twin360-blue)]"
                    : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)]"
                }`}
              >
                {entry === "photo_burst" ? (
                  <ImageIcon className="h-4 w-4" />
                ) : (
                  <Video className="h-4 w-4" />
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
              disabled={!camera.isStreaming}
              onClick={handleBurst}
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
              onClick={handleCancel}
              className={`min-h-14 min-w-[4.5rem] rounded-xl px-3 text-xs font-bold ${twinAccent.buttonDanger}`}
            >
              Cancel
            </button>
            {recording ? (
              <>
                <button
                  type="button"
                  onClick={handleRecordToggle}
                  className={`inline-flex min-h-14 min-w-14 items-center justify-center rounded-xl border ${twinAccent.button}`}
                  aria-label={paused ? "Resume recording" : "Pause recording"}
                >
                  {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="inline-flex min-h-14 min-w-14 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] text-[var(--graphite-text-header)]"
                  aria-label="Stop recording"
                >
                  <Square className="h-5 w-5 fill-current" />
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={!camera.isStreaming}
                onClick={() => setRecording(true)}
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
            onClick={handleFinish}
            className={`mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold ${twinAccent.button}`}
          >
            <ArrowLeft className="h-4 w-4 rotate-180" />
            Continue to submission
          </button>
        )}
      </footer>
    </div>
  );
}
