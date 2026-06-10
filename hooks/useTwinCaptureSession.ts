"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { useCamera } from "@/lib/hooks/useCamera";
import type { useTwinVideoRecorder } from "@/hooks/useTwinVideoRecorder";

export type TwinCaptureMode = "video" | "photos";
export type PhotoIntervalSec = 0.5 | 1 | 2;

export const TWIN_PHOTO_INTERVALS: PhotoIntervalSec[] = [0.5, 1, 2];

export type TwinCaptureClip = {
  id: string;
  index: number;
  mode: TwinCaptureMode;
  durationSeconds: number;
  frameCount: number;
  recording: boolean;
};

type CameraApi = ReturnType<typeof useCamera>;
type RecorderApi = ReturnType<typeof useTwinVideoRecorder>;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatTwinClipLabel(clip: TwinCaptureClip): string {
  return `CLIP ${clip.index} · ${formatTimer(clip.durationSeconds)}`;
}

type Args = {
  camera: CameraApi;
  videoRecorder: RecorderApi;
};

export type TwinCaptureClipReviewPayload = {
  id: string;
  index: number;
  mode: TwinCaptureMode;
  durationSeconds: number;
  frameCount: number;
  files: File[];
  thumbnailUrl: string | null;
};

export function useTwinCaptureSession({ camera, videoRecorder }: Args) {
  const capturedFilesRef = useRef<File[]>([]);
  const clipFilesRef = useRef<Map<string, File[]>>(new Map());
  const [mode, setMode] = useState<TwinCaptureMode>("video");
  const [clips, setClips] = useState<TwinCaptureClip[]>([]);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [photoInterval, setPhotoInterval] = useState<PhotoIntervalSec>(1);
  const [photoAutoActive, setPhotoAutoActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const photoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { recording: videoRecording } = videoRecorder;
  const isRecording = videoRecording || photoAutoActive;
  const activeClip = clips.find((clip) => clip.id === activeClipId) ?? null;
  const recSeconds = activeClip?.durationSeconds ?? 0;
  const hasContent = clips.some((clip) => clip.frameCount > 0);

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

  const getActiveStream = useCallback((): MediaStream | null => {
    const src = camera.videoRef.current?.srcObject;
    return src instanceof MediaStream ? src : null;
  }, [camera.videoRef]);

  const captureFrame = useCallback(
    (clipId: string) => {
      if (!camera.isStreaming) return;
      const result = camera.capturePhoto();
      if (!result) return;
      const file = new File([result.blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
      capturedFilesRef.current.push(file);
      const bucket = clipFilesRef.current.get(clipId) ?? [];
      clipFilesRef.current.set(clipId, [...bucket, file]);
      setClips((prev) =>
        prev.map((clip) =>
          clip.id === clipId ? { ...clip, frameCount: clip.frameCount + 1 } : clip,
        ),
      );
    },
    [camera],
  );

  const finalizeClip = useCallback((clipId: string) => {
    setClips((prev) =>
      prev.map((clip) => (clip.id === clipId ? { ...clip, recording: false } : clip)),
    );
    setActiveClipId(null);
  }, []);

  const startPhotoClip = useCallback(() => {
    const id = `clip-${Date.now()}`;
    const index = clips.length + 1;
    const clip: TwinCaptureClip = {
      id,
      index,
      mode: "photos",
      durationSeconds: 0,
      frameCount: 0,
      recording: true,
    };
    setClips((prev) => [...prev, clip]);
    setActiveClipId(id);
    setPhotoAutoActive(true);
    stopPhotoInterval();
    captureFrame(id);
    photoIntervalRef.current = setInterval(() => captureFrame(id), photoInterval * 1000);
  }, [captureFrame, clips.length, photoInterval, stopPhotoInterval]);

  const stopPhotoClip = useCallback(() => {
    stopPhotoInterval();
    setPhotoAutoActive(false);
    if (activeClipId) finalizeClip(activeClipId);
  }, [activeClipId, finalizeClip, stopPhotoInterval]);

  const startVideoClip = useCallback(() => {
    const stream = getActiveStream();
    if (!stream) return;
    const id = `clip-${Date.now()}`;
    const index = clips.length + 1;
    setClips((prev) => [
      ...prev,
      {
        id,
        index,
        mode: "video",
        durationSeconds: 0,
        frameCount: 0,
        recording: true,
      },
    ]);
    setActiveClipId(id);
    videoRecorder.startRecording(stream);
  }, [clips.length, getActiveStream, videoRecorder]);

  const stopVideoClip = useCallback(async () => {
    const clipId = activeClipId;
    stopDurationTimer();
    const file = await videoRecorder.stopRecording();
    if (file && clipId) {
      capturedFilesRef.current.push(file);
      clipFilesRef.current.set(clipId, [file]);
      setClips((prev) =>
        prev.map((clip) =>
          clip.id === clipId
            ? { ...clip, recording: false, frameCount: 1 }
            : clip,
        ),
      );
    } else if (clipId) {
      setClips((prev) => prev.filter((clip) => clip.id !== clipId));
    }
    setActiveClipId(null);
  }, [activeClipId, finalizeClip, stopDurationTimer, videoRecorder]);

  const handleShutterTap = useCallback(() => {
    if (mode === "photos") {
      if (photoAutoActive) stopPhotoClip();
      else startPhotoClip();
      return;
    }
    if (videoRecording) void stopVideoClip();
    else startVideoClip();
  }, [mode, photoAutoActive, startPhotoClip, startVideoClip, stopPhotoClip, stopVideoClip, videoRecording]);

  const cyclePhotoInterval = useCallback(() => {
    if (isRecording) return;
    const idx = TWIN_PHOTO_INTERVALS.indexOf(photoInterval);
    const next = TWIN_PHOTO_INTERVALS[(idx + 1) % TWIN_PHOTO_INTERVALS.length];
    setPhotoInterval(next);
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
      }
      if (activeClipId) finalizeClip(activeClipId);
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

    return { clips: clipsPayload, allFiles: [...capturedFilesRef.current] };
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

  const collectFiles = useCallback(async (): Promise<File[]> => {
    const review = await collectForReview();
    return review.allFiles;
  }, [collectForReview]);

  return {
    mode,
    clips,
    activeClipId,
    activeClip,
    photoInterval,
    photoAutoActive,
    isRecording,
    recSeconds,
    hasContent,
    handleShutterTap,
    handleModeChange,
    cyclePhotoInterval,
    collectFiles,
    collectForReview,
    getActiveStream,
  };
}
