"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import type { useCamera } from "@/lib/hooks/useCamera";
import { captureCanvasGlass } from "./capture-canvas-glass-tokens";
import { CAPTURE_V2_LAYER_IDS, CAPTURE_V2_LAYERS } from "./layers";

const CANVAS_OS_SAFETY =
  "touch-manipulation select-none [-webkit-touch-callout:none] [-webkit-user-select:none]";

type CameraApi = ReturnType<typeof useCamera>;

type Props = {
  camera: CameraApi;
  facingMode?: "user" | "environment";
  autoStart?: boolean;
  fullBleed?: boolean;
  hidden?: boolean;
  captureBlocked?: boolean;
  onStartCamera?: () => void;
};

function isPermissionDeniedError(message: string | null) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes("permission denied") || normalized.includes("notallowederror");
}

export function CaptureV2LiveCamera({
  camera,
  facingMode = "environment",
  autoStart = false,
  fullBleed = false,
  hidden = false,
  captureBlocked = false,
  onStartCamera,
}: Props) {
  const {
    videoRef,
    isStreaming,
    streamAlive,
    videoAttached,
    needsUserResume,
    hasLiveFrames,
    error,
    startCamera,
    clearError,
    reattachVideo,
  } = camera;
  const [scale, setScale] = useState(1);
  const autoStartAttemptedRef = useRef(false);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

  const handleStart = useCallback(async () => {
    onStartCamera?.();
    clearError();
    if (streamAlive && !needsUserResume) {
      await reattachVideo();
      return;
    }
    await startCamera(facingMode);
  }, [clearError, facingMode, needsUserResume, onStartCamera, reattachVideo, startCamera, streamAlive]);

  useEffect(() => {
    if (!autoStart || hidden || autoStartAttemptedRef.current) return;
    if (isStreaming && videoAttached) return;
    autoStartAttemptedRef.current = true;
    void handleStart();
  }, [autoStart, handleStart, hidden, isStreaming, videoAttached]);

  useEffect(() => {
    if (!autoStart || hidden || isStreaming || !error || !isPermissionDeniedError(error)) return;
    clearError();
  }, [autoStart, clearError, error, hidden, isStreaming]);

  function onTouchStart(event: React.TouchEvent) {
    if (hidden || event.touches.length !== 2) return;
    event.preventDefault();
    const [a, b] = [event.touches[0]!, event.touches[1]!];
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    pinchRef.current = { distance, scale };
  }

  function onTouchMove(event: React.TouchEvent) {
    if (hidden || event.touches.length !== 2 || !pinchRef.current) return;
    event.preventDefault();
    const [a, b] = [event.touches[0]!, event.touches[1]!];
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const ratio = distance / pinchRef.current.distance;
    setScale(Math.min(3, Math.max(1, pinchRef.current.scale * ratio)));
  }

  function onTouchEnd() {
    pinchRef.current = null;
  }

  const showVideo = isStreaming && videoAttached && !error && !needsUserResume;
  const showResume = needsUserResume || (streamAlive && !videoAttached && !error);
  const showEnable = !showVideo && !showResume && !error;

  return (
    <div
      id={CAPTURE_V2_LAYER_IDS.canvasBase}
      className={`relative ${CAPTURE_V2_LAYERS.canvas} flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--surface-zinc)] ${CANVAS_OS_SAFETY} ${
        fullBleed
          ? "absolute inset-0 h-full w-full border-0"
          : "border border-[var(--surface-zinc-border)]"
      } ${hidden ? "pointer-events-none opacity-0" : ""}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      aria-hidden={hidden}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 z-[1] h-full w-full object-cover transition-transform duration-75 ${
          showVideo ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ transform: `scale(${scale})` }}
      />

      {captureBlocked && showVideo && !hasLiveFrames ? (
        <div className="relative z-[3] flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
          <div className={`${captureCanvasGlass.surface} ${captureCanvasGlass.radiusLg} space-y-3 px-5 py-4`}>
            <p className="text-sm font-bold text-[var(--graphite-text-header)]">Camera warming up</p>
            <p className="text-xs font-medium leading-snug text-[var(--graphite-muted)]">
              Wait for live frames before capturing.
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <CameraErrorState error={error} onRetry={() => void handleStart()} />
      ) : showResume ? (
        <CameraResumeState onResume={(event) => {
          event.stopPropagation();
          void handleStart();
        }} />
      ) : showEnable ? (
        <CameraEnableState onEnable={(event) => {
          event.stopPropagation();
          void handleStart();
        }} />
      ) : null}
    </div>
  );
}

function CameraResumeState({ onResume }: { onResume: (event: React.MouseEvent) => void }) {
  return (
    <div className="relative z-[2] flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className={`${captureCanvasGlass.surface} ${captureCanvasGlass.radiusLg} space-y-3 px-5 py-4`}>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--mobile-app-card-icon-border-primary)] bg-[var(--mobile-app-card-icon-bg-primary)] text-[var(--mobile-app-card-icon-fg-primary)]">
          <Camera className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <p className="text-sm font-bold text-[var(--graphite-text-header)]">Tap to resume camera</p>
        <p className="text-xs font-medium leading-snug text-[var(--graphite-muted)]">
          iOS paused the camera. Tap below to turn the viewfinder back on.
        </p>
        <button
          type="button"
          onClick={onResume}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--mobile-app-card-border-primary)] bg-[var(--mobile-app-card-bg)] px-5 text-sm font-bold text-[var(--graphite-text-header)] shadow-[var(--mobile-app-card-shadow)] transition active:scale-[0.99]"
        >
          Resume camera
        </button>
      </div>
    </div>
  );
}

function CameraEnableState({ onEnable }: { onEnable: (event: React.MouseEvent) => void }) {
  return (
    <div className="relative z-[2] flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className={`${captureCanvasGlass.surface} ${captureCanvasGlass.radiusLg} space-y-3 px-5 py-4`}>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--mobile-app-card-icon-border-primary)] bg-[var(--mobile-app-card-icon-bg-primary)] text-[var(--mobile-app-card-icon-fg-primary)]">
          <Camera className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <p className="text-sm font-bold text-[var(--graphite-text-header)]">Live camera</p>
        <p className="text-xs font-medium leading-snug text-[var(--graphite-muted)]">
          Tap below to enable the camera. Pinch to zoom once streaming.
        </p>
        <button
          type="button"
          onClick={onEnable}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--mobile-app-card-border-primary)] bg-[var(--mobile-app-card-bg)] px-5 text-sm font-bold text-[var(--graphite-text-header)] shadow-[var(--mobile-app-card-shadow)] transition active:scale-[0.99]"
        >
          Enable camera
        </button>
      </div>
    </div>
  );
}

function CameraErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="relative z-[2] flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className={`${captureCanvasGlass.surface} ${captureCanvasGlass.radiusLg} space-y-3 px-5 py-4`}>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--surface-zinc)_88%,transparent)] text-[var(--graphite-muted)]">
          <Camera className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <p className="text-sm font-bold text-[var(--graphite-text-header)]">Camera unavailable</p>
        <p className="text-xs font-medium leading-snug text-[var(--graphite-muted)]">{error}</p>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRetry();
          }}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--mobile-app-card-border-primary)] bg-[var(--mobile-app-card-bg)] px-5 text-sm font-bold text-[var(--graphite-text-header)] shadow-[var(--mobile-app-card-shadow)] transition active:scale-[0.99]"
        >
          Retry camera
        </button>
      </div>
    </div>
  );
}

export function CaptureV2LiveCameraBusyOverlay({ busy }: { busy: boolean }) {
  if (!busy) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)]">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--graphite-primary)] border-t-transparent" aria-hidden />
    </div>
  );
}
