"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { TWIN_CAPTURE_GLASS_SQUARE } from "./twin-capture-glass";
import type { useTwinCaptureCamera } from "./useTwinCaptureCamera";

type CameraApi = ReturnType<typeof useTwinCaptureCamera>;

type Props = {
  camera: CameraApi;
  facingMode?: "user" | "environment";
  autoStart?: boolean;
  fullBleed?: boolean;
  onResume?: () => void;
};

export function TwinCaptureLiveCamera({
  camera,
  facingMode = "environment",
  autoStart = true,
  fullBleed = false,
  onResume,
}: Props) {
  const { videoRef, isStreaming, needsResume, error, startCamera, clearError } = camera;
  const [scale, setScale] = useState(1);
  const autoStartAttemptedRef = useRef(false);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

  const handleStart = useCallback(async () => {
    clearError();
    await startCamera(facingMode);
  }, [clearError, facingMode, startCamera]);

  useEffect(() => {
    if (!autoStart || autoStartAttemptedRef.current || isStreaming) return;
    autoStartAttemptedRef.current = true;
    void startCamera(facingMode);
  }, [autoStart, facingMode, isStreaming, startCamera]);

  // Permission-denied must stay visible with guidance — auto-clearing it
  // looped users on a generic "Enable camera" with no explanation.

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

  const rootClass = fullBleed
    ? "absolute inset-0 overflow-hidden bg-[var(--graphite-canvas)] touch-manipulation select-none [-webkit-touch-callout:none] [-webkit-user-select:none]"
    : "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--graphite-canvas)] touch-manipulation select-none [-webkit-touch-callout:none] [-webkit-user-select:none]";

  const showLive = isStreaming && !error && !needsResume;

  return (
    <div
      className={rootClass}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={() => {
        pinchRef.current = null;
      }}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 z-[1] h-full w-full object-cover transition-transform duration-75 ${
          showLive ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ transform: `scale(${scale})` }}
      />

      {error ? (
        <CameraFallback
          title="Camera unavailable"
          detail={error}
          actionLabel="Retry camera"
          onAction={() => void handleStart()}
        />
      ) : needsResume ? (
        <CameraFallback
          title="Camera paused"
          detail="Tap to resume camera before recording."
          actionLabel="Tap to resume camera"
          onAction={() => onResume?.()}
        />
      ) : !isStreaming ? (
        <CameraFallback
          title="Live camera"
          detail="Tap below to enable the camera. Pinch to zoom once streaming."
          actionLabel="Enable camera"
          onAction={() => void handleStart()}
        />
      ) : null}
    </div>
  );
}

function CameraFallback({
  title,
  detail,
  actionLabel,
  onAction,
}: {
  title: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="relative z-[2] flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <span
        className={`flex h-14 w-14 items-center justify-center ${TWIN_CAPTURE_GLASS_SQUARE} ${twinAccent.iconChip}`}
      >
        <Camera className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <div className={`space-y-1 px-4 py-3 ${TWIN_CAPTURE_GLASS_SQUARE}`}>
        <p className="text-sm font-bold text-[var(--graphite-text-header)]">{title}</p>
        <p className="text-xs font-medium leading-snug text-[var(--graphite-muted)]">{detail}</p>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAction();
        }}
        className={`inline-flex min-h-11 items-center justify-center px-5 text-sm font-bold text-[var(--graphite-text-header)] shadow-[var(--mobile-app-card-shadow)] transition active:scale-[0.99] ${twinAccent.button}`}
      >
        {actionLabel}
      </button>
    </div>
  );
}
