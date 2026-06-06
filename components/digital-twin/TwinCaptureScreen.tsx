"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconCameraRotate, IconX } from "@tabler/icons-react";
import { useCamera } from "@/lib/hooks/useCamera";
import { isTwinVideoRecordingSupported, useTwinVideoRecorder } from "@/hooks/useTwinVideoRecorder";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { formatTwinBytes } from "@/lib/digital-twin/format-bytes";
import { TwinCaptureFooter } from "./TwinCaptureFooter";
import { TwinCaptureLiveCamera } from "./TwinCaptureLiveCamera";

type CaptureMode = "photo_burst" | "video_walk";

export type TwinCaptureFinishResult = {
  files: File[];
  photoCount: number;
  videoSeconds: number;
  estimatedBytes: number;
};

type Props = {
  spaceName?: string;
  onCancel?: () => void;
  onFinish?: (result: TwinCaptureFinishResult) => void;
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
  const videoRecorder = useTwinVideoRecorder();
  const capturedFilesRef = useRef<File[]>([]);
  const [mode, setMode] = useState<CaptureMode>("photo_burst");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [photoCount, setPhotoCount] = useState(0);
  const [videoSeconds, setVideoSeconds] = useState(0);
  const [topCollapsed, setTopCollapsed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { recording, paused } = videoRecorder;
  const [videoWalkSupported, setVideoWalkSupported] = useState(true);

  useEffect(() => {
    setVideoWalkSupported(isTwinVideoRecordingSupported());
  }, []);

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
    const index = photoCount + 1;
    const file = new File([result.blob], `photo_${Date.now()}_${index}.jpg`, {
      type: "image/jpeg",
    });
    capturedFilesRef.current.push(file);
    setPhotoCount((value) => value + 1);
  }, [camera, photoCount]);

  const getActiveStream = useCallback((): MediaStream | null => {
    const src = camera.videoRef.current?.srcObject;
    return src instanceof MediaStream ? src : null;
  }, [camera.videoRef]);

  const handleRecordToggle = useCallback(() => {
    if (!recording) {
      const stream = getActiveStream();
      if (!stream) return;
      videoRecorder.startRecording(stream);
      return;
    }
    if (paused) {
      videoRecorder.resumeRecording();
      return;
    }
    videoRecorder.pauseRecording();
  }, [getActiveStream, paused, recording, videoRecorder]);

  const handleStopRecording = useCallback(() => {
    stopTimer();
    void videoRecorder.stopRecording().then((file) => {
      if (file) capturedFilesRef.current.push(file);
    });
  }, [stopTimer, videoRecorder]);

  const handleCancel = useCallback(() => {
    stopTimer();
    camera.stopCamera();
    onCancel?.();
  }, [camera, onCancel, stopTimer]);

  const handleFinish = useCallback(async () => {
    stopTimer();
    if (recording) {
      const videoFile = await videoRecorder.stopRecording();
      if (videoFile) capturedFilesRef.current.push(videoFile);
    }
    camera.stopCamera();
    onFinish?.({
      files: [...capturedFilesRef.current],
      photoCount,
      videoSeconds,
      estimatedBytes,
    });
  }, [camera, estimatedBytes, onFinish, photoCount, recording, stopTimer, videoRecorder, videoSeconds]);

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
            <IconX className="h-5 w-5" stroke={1.75} />
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
            <IconCameraRotate className="h-5 w-5" stroke={1.75} />
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

      <TwinCaptureFooter
        mode={mode}
        recording={recording}
        paused={paused}
        isStreaming={camera.isStreaming}
        photoCount={photoCount}
        videoSeconds={videoSeconds}
        videoWalkSupported={videoWalkSupported}
        onModeChange={(entry) => {
          if (entry === "video_walk" && !videoWalkSupported) return;
          if (recording) void handleStopRecording();
          setMode(entry);
        }}
        onBurst={handleBurst}
        onCancel={handleCancel}
        onRecordToggle={handleRecordToggle}
        onStopRecording={handleStopRecording}
        onStartRecording={() => {
          const stream = getActiveStream();
          if (stream) videoRecorder.startRecording(stream);
        }}
        onFinish={() => void handleFinish()}
      />
    </div>
  );
}
