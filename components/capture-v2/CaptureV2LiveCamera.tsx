"use client";

import { useCallback, useRef, useState } from "react";
import { Camera } from "lucide-react";
import type { useCamera } from "@/lib/hooks/useCamera";
import { CAPTURE_V2_LAYER_IDS, CAPTURE_V2_LAYERS } from "./layers";

const CANVAS_OS_SAFETY =
  "touch-manipulation select-none [-webkit-touch-callout:none] [-webkit-user-select:none]";

type CameraApi = ReturnType<typeof useCamera>;

type Props = {
  camera: CameraApi;
  facingMode?: "user" | "environment";
  onStartCamera?: () => void;
};

export function CaptureV2LiveCamera({
  camera,
  facingMode = "environment",
  onStartCamera,
}: Props) {
  const { videoRef, isStreaming, error, startCamera } = camera;
  const [scale, setScale] = useState(1);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

  const handleStart = useCallback(async () => {
    onStartCamera?.();
    await startCamera(facingMode);
  }, [facingMode, onStartCamera, startCamera]);

  function onTouchStart(event: React.TouchEvent) {
    if (event.touches.length === 2) {
      event.preventDefault();
      const [a, b] = [event.touches[0]!, event.touches[1]!];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { distance, scale };
    }
  }

  function onTouchMove(event: React.TouchEvent) {
    if (event.touches.length !== 2 || !pinchRef.current) return;
    event.preventDefault();
    const [a, b] = [event.touches[0]!, event.touches[1]!];
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const ratio = distance / pinchRef.current.distance;
    setScale(Math.min(3, Math.max(1, pinchRef.current.scale * ratio)));
  }

  function onTouchEnd() {
    pinchRef.current = null;
  }

  return (
    <div
      id={CAPTURE_V2_LAYER_IDS.canvasBase}
      className={`relative ${CAPTURE_V2_LAYERS.canvas} flex min-h-0 flex-1 flex-col overflow-hidden border border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] ${CANVAS_OS_SAFETY}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 z-[1] h-full w-full object-cover transition-transform duration-75 ${
          isStreaming && !error ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ transform: `scale(${scale})` }}
      />

      {error ? (
        <CameraErrorState error={error} onRetry={() => void handleStart()} />
      ) : !isStreaming ? (
        <CameraEnableState onEnable={(event) => {
          event.stopPropagation();
          void handleStart();
        }} />
      ) : null}
    </div>
  );
}

function CameraEnableState({ onEnable }: { onEnable: (event: React.MouseEvent) => void }) {
  return (
    <div className="relative z-[2] flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--mobile-app-card-icon-border-primary)] bg-[var(--mobile-app-card-icon-bg-primary)] text-[var(--mobile-app-card-icon-fg-primary)]">
        <Camera className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-bold text-[var(--graphite-text-header)]">Live camera</p>
        <p className="text-xs font-medium leading-snug text-[var(--graphite-muted)]">
          Tap below to enable the camera. Pinch to zoom once streaming.
        </p>
      </div>
      <button
        type="button"
        onClick={onEnable}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border-primary)] bg-[var(--mobile-app-card-bg)] px-5 text-sm font-bold text-[var(--graphite-text-header)] shadow-[var(--mobile-app-card-shadow)] transition active:scale-[0.99]"
      >
        Enable camera
      </button>
    </div>
  );
}

function CameraErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="relative z-[2] flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--surface-zinc)_88%,transparent)] text-[var(--graphite-muted)]">
        <Camera className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-bold text-[var(--graphite-text-header)]">Camera unavailable</p>
        <p className="text-xs font-medium leading-snug text-[var(--graphite-muted)]">{error}</p>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRetry();
        }}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border-primary)] bg-[var(--mobile-app-card-bg)] px-5 text-sm font-bold text-[var(--graphite-text-header)] shadow-[var(--mobile-app-card-shadow)] transition active:scale-[0.99]"
      >
        Retry camera
      </button>
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
