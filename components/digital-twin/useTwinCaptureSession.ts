"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { useTwinCaptureCamera } from "./useTwinCaptureCamera";
import type { useTwinCaptureVideoRecorder } from "./useTwinCaptureVideoRecorder";

export type TwinCaptureMode = "video" | "photos";
export type PhotoIntervalSec = 0.5 | 1 | 2;

export const TWIN_PHOTO_INTERVALS: PhotoIntervalSec[] = [0.5, 1, 2];
export const TWIN_PHOTO_FRAME_CAP = 200;

export type TwinCaptureClip = {
  id: string;
  index: number;
  mode: TwinCaptureMode;
  durationSeconds: number;
  frameCount: number;
  recording: boolean;
};

type CameraApi = ReturnType<typeof useTwinCaptureCamera>;
type RecorderApi = ReturnType<typeof useTwinCaptureVideoRecorder>;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatTwinClipLabel(clip: TwinCaptureClip): string {
  return `CLIP ${clip.index} · ${formatTimer(clip.durationSeconds)}`;
}

export type TwinCaptureClipReviewPayload = {
  id: string;
  index: number;
  mode: TwinCaptureMode;
  durationSeconds: number;
  frameCount: number;
  files: File[];
  thumbnailUrl: string | null;
};

type Args = {
  camera: CameraApi;
  videoRecorder: RecorderApi;
  onError?: (message: string) => void;
  devSeedClipCount?: number;
  devInitialMode?: TwinCaptureMode;
};

function buildMockClips(count: number): TwinCaptureClip[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `dev-clip-${index + 1}`,
    index: index + 1,
    mode: "video" as const,
    durationSeconds: 12 + index * 3,
    frameCount: 1,
    recording: false,
  }));
}

export function useTwinCaptureSession({
  camera,
  videoRecorder,
  onError,
  devSeedClipCount,
  devInitialMode,
}: Args) {
  const capturedFilesRef = useRef<File[]>([]);
  const clipFilesRef = useRef<Map<string, File[]>>(new Map());
  const [mode, setMode] = useState<TwinCaptureMode>(devInitialMode ?? "video");
  const [clips, setClips] = useState<TwinCaptureClip[]>([]);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [photoInterval, setPhotoInterval] = useState<PhotoIntervalSec>(1);
  const [photoAutoActive, setPhotoAutoActive] = useState(false);
  const [photoFrameCapHit, setPhotoFrameCapHit] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const photoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const photoCapturingRef = useRef(false);

  const countCapturedPhotoFrames = useCallback(() => {
    let count = 0;
    clipFilesRef.current.forEach((files) => {
      count += files.length;
    });
    return count;
  }, []);

  const reportError = useCallback(
    (message: string) => {
      onError?.(message);
    },
    [onError],
  );

  const { recording: videoRecording } = videoRecorder;
  const isRecording = videoRecording || photoAutoActive;
  const activeClip = clips.find((clip) => clip.id === activeClipId) ?? null;
  const recSeconds = activeClip?.durationSeconds ?? 0;
  const hasContent = clips.some((clip) => clip.frameCount > 0);
  const totalPhotoFrames = clips.reduce((sum, clip) => sum + clip.frameCount, 0);
  const atPhotoFrameCap = totalPhotoFrames >= TWIN_PHOTO_FRAME_CAP;

  const stopDurationTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopPhotoInterval = useCallback(() => {
    if (photoIntervalRef.current) {
      clearInterval(photoIntervalRef.current);
      photoIntervalRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopDurationTimer();
    stopPhotoInterval();
  }, [stopDurationTimer, stopPhotoInterval]);

  useEffect(() => {
    if (!devSeedClipCount || devSeedClipCount <= 0) return;
    setClips(buildMockClips(devSeedClipCount));
  }, [devSeedClipCount]);

  useEffect(() => {
    if (!isRecording || !activeClipId) {
      stopDurationTimer();
      return;
    }
    timerRef.current = setInterval(() => {
      setClips((prev) =>
        prev.map((clip) =>
          clip.id === activeClipId ? { ...clip, durationSeconds: clip.durationSeconds + 1 } : clip,
        ),
      );
    }, 1000);
    return stopDurationTimer;
  }, [activeClipId, isRecording, stopDurationTimer]);

  const captureFrame = useCallback(
    async (clipId: string) => {
      if (!camera.isStreaming || camera.needsResume) {
        reportError("Camera is not ready. Tap to resume camera.");
        return false;
      }
      if (countCapturedPhotoFrames() >= TWIN_PHOTO_FRAME_CAP) {
        setPhotoFrameCapHit(true);
        reportError(`Frame cap reached (${TWIN_PHOTO_FRAME_CAP}). End this clip to continue.`);
        return false;
      }
      if (photoCapturingRef.current) return false;
      photoCapturingRef.current = true;
      try {
        const result = await camera.capturePhoto();
        if (!result) {
          reportError("Could not capture photo frame. Hold steady and try again.");
          return false;
        }
        const file = new File([result.blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        capturedFilesRef.current.push(file);
        const bucket = clipFilesRef.current.get(clipId) ?? [];
        clipFilesRef.current.set(clipId, [...bucket, file]);
        setClips((prev) =>
          prev.map((clip) =>
            clip.id === clipId ? { ...clip, frameCount: clip.frameCount + 1 } : clip,
          ),
        );
        return true;
      } finally {
        photoCapturingRef.current = false;
      }
    },
    [camera, countCapturedPhotoFrames, reportError],
  );

  const finalizeClip = useCallback((clipId: string) => {
    setClips((prev) =>
      prev.map((clip) => (clip.id === clipId ? { ...clip, recording: false } : clip)),
    );
    setActiveClipId(null);
  }, []);

  const startPhotoClip = useCallback(async () => {
    const stream = camera.getActiveStream();
    if (!stream) {
      reportError("Camera stream is not active. Tap to resume camera.");
      return;
    }
    const id = `clip-${Date.now()}`;
    const index = clips.length + 1;
    setClips((prev) => [
      ...prev,
      { id, index, mode: "photos", durationSeconds: 0, frameCount: 0, recording: true },
    ]);
    setActiveClipId(id);
    setPhotoAutoActive(true);
    stopPhotoInterval();
    const firstOk = await captureFrame(id);
    if (!firstOk) {
      setPhotoAutoActive(false);
      setActiveClipId(null);
      setClips((prev) => prev.filter((clip) => clip.id !== id));
      return;
    }
    photoIntervalRef.current = setInterval(() => {
      if (countCapturedPhotoFrames() >= TWIN_PHOTO_FRAME_CAP) {
        stopPhotoInterval();
        setPhotoFrameCapHit(true);
        reportError(`Frame cap reached (${TWIN_PHOTO_FRAME_CAP}). End this clip to continue.`);
        return;
      }
      void captureFrame(id);
    }, photoInterval * 1000);
  }, [
    camera,
    captureFrame,
    clips.length,
    countCapturedPhotoFrames,
    photoInterval,
    reportError,
    stopPhotoInterval,
  ]);

  const stopPhotoClip = useCallback(() => {
    stopPhotoInterval();
    setPhotoAutoActive(false);
    if (activeClipId) finalizeClip(activeClipId);
  }, [activeClipId, finalizeClip, stopPhotoInterval]);

  const startVideoClip = useCallback(() => {
    const stream = camera.getActiveStream();
    if (!stream) {
      reportError("Camera stream is not active. Tap to resume camera.");
      return false;
    }
    videoRecorder.clearError();
    const id = `clip-${Date.now()}`;
    const index = clips.length + 1;
    setClips((prev) => [
      ...prev,
      { id, index, mode: "video", durationSeconds: 0, frameCount: 0, recording: true },
    ]);
    setActiveClipId(id);
    const started = videoRecorder.startRecording(stream);
    if (!started.ok) {
      setClips((prev) => prev.filter((clip) => clip.id !== id));
      setActiveClipId(null);
      reportError(started.message);
      return false;
    }
    return true;
  }, [camera, clips.length, reportError, videoRecorder]);

  const stopVideoClip = useCallback(async () => {
    const clipId = activeClipId;
    stopDurationTimer();
    const file = await videoRecorder.stopRecording();
    if (file && clipId) {
      capturedFilesRef.current.push(file);
      clipFilesRef.current.set(clipId, [file]);
      setClips((prev) =>
        prev.map((clip) =>
          clip.id === clipId ? { ...clip, recording: false, frameCount: 1 } : clip,
        ),
      );
      setActiveClipId(null);
      return;
    }
    if (videoRecorder.error) reportError(videoRecorder.error);
    if (clipId) setClips((prev) => prev.filter((clip) => clip.id !== clipId));
    setActiveClipId(null);
  }, [activeClipId, reportError, stopDurationTimer, videoRecorder]);

  const handleShutterTap = useCallback(() => {
    if (camera.needsResume || !camera.getActiveStream()) {
      reportError("Camera stream is not active. Tap to resume camera.");
      return;
    }
    if (mode === "photos") {
      if (photoAutoActive) stopPhotoClip();
      else void startPhotoClip();
      return;
    }
    if (videoRecording) void stopVideoClip();
    else startVideoClip();
  }, [
    camera,
    mode,
    photoAutoActive,
    reportError,
    startPhotoClip,
    startVideoClip,
    stopPhotoClip,
    stopVideoClip,
    videoRecording,
  ]);

  const cyclePhotoInterval = useCallback(() => {
    if (isRecording) return;
    const idx = TWIN_PHOTO_INTERVALS.indexOf(photoInterval);
    setPhotoInterval(TWIN_PHOTO_INTERVALS[(idx + 1) % TWIN_PHOTO_INTERVALS.length]!);
  }, [isRecording, photoInterval]);

  const handleModeChange = useCallback(
    (next: TwinCaptureMode) => {
      if (isRecording) return;
      setMode(next);
    },
    [isRecording],
  );

  const collectForReview = useCallback(async (): Promise<{
    clips: TwinCaptureClipReviewPayload[];
    allFiles: File[];
  }> => {
    stopPhotoInterval();
    stopDurationTimer();
    if (videoRecording) {
      const file = await videoRecorder.stopRecording();
      if (file && activeClipId) {
        capturedFilesRef.current.push(file);
        clipFilesRef.current.set(activeClipId, [file]);
        finalizeClip(activeClipId);
      } else if (activeClipId) {
        setClips((prev) => prev.filter((clip) => clip.id !== activeClipId));
        setActiveClipId(null);
        if (videoRecorder.error) throw new Error(videoRecorder.error);
      }
    }
    if (photoAutoActive) stopPhotoClip();

    const clipsPayload = clips.map((clip) => {
      const files = clipFilesRef.current.get(clip.id) ?? [];
      const thumbFile = files.find((row) => row.type.startsWith("image/"));
      return {
        id: clip.id,
        index: clip.index,
        mode: clip.mode,
        durationSeconds: clip.durationSeconds,
        frameCount: clip.frameCount,
        files,
        thumbnailUrl: thumbFile ? URL.createObjectURL(thumbFile) : null,
      };
    });

    const allFiles = [...capturedFilesRef.current];
    if (!allFiles.length) throw new Error("No capture files — record at least one clip.");
    return { clips: clipsPayload, allFiles };
  }, [
    activeClipId,
    clips,
    finalizeClip,
    photoAutoActive,
    stopDurationTimer,
    stopPhotoInterval,
    stopPhotoClip,
    videoRecording,
    videoRecorder,
  ]);

  return {
    mode,
    clips,
    activeClipId,
    activeClip,
    photoInterval,
    photoAutoActive,
    photoFrameCapHit,
    totalPhotoFrames,
    atPhotoFrameCap,
    isRecording,
    recSeconds,
    hasContent,
    handleShutterTap,
    handleModeChange,
    cyclePhotoInterval,
    collectForReview,
  };
}
