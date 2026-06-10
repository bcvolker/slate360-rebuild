"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CaptureResult = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
};

function mapCameraError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return "Camera permission denied. Allow camera access in Settings, then tap Retry.";
    }
    if (err.name === "NotFoundError") return "No camera found on this device.";
    if (err.name === "NotReadableError") {
      return "Camera is in use by another app. Close it and tap Retry.";
    }
    if (err.name === "OverconstrainedError") {
      return "This camera mode is not available on this device.";
    }
  }
  return err instanceof Error ? err.message : "Camera unavailable";
}

function isStreamAlive(stream: MediaStream | null): boolean {
  if (!stream) return false;
  const tracks = stream.getVideoTracks();
  return tracks.length > 0 && tracks.every((track) => track.readyState === "live");
}

async function waitForVideoFrame(video: HTMLVideoElement, timeoutMs = 4000): Promise<boolean> {
  if (video.videoWidth > 0 && video.readyState >= 2) return true;
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const done = (ok: boolean) => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("loadedmetadata", onReady);
      resolve(ok);
    };
    const onReady = () => {
      if (video.videoWidth > 0 && video.readyState >= 2) done(true);
    };
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("loadedmetadata", onReady);
    const tick = () => {
      if (video.videoWidth > 0 && video.readyState >= 2) {
        done(true);
        return;
      }
      if (Date.now() > deadline) {
        done(false);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export function useTwinCaptureCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [needsResume, setNeedsResume] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attachStreamListeners = useCallback((stream: MediaStream) => {
    const syncAlive = () => {
      const alive = isStreamAlive(stream);
      setNeedsResume(!alive);
      if (!alive) setIsStreaming(false);
    };
    stream.getVideoTracks().forEach((track) => {
      track.addEventListener("ended", syncAlive);
      track.addEventListener("mute", syncAlive);
    });
    return () => {
      stream.getVideoTracks().forEach((track) => {
        track.removeEventListener("ended", syncAlive);
        track.removeEventListener("mute", syncAlive);
      });
    };
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
    setNeedsResume(false);
  }, []);

  const startCamera = useCallback(async (facingMode: "user" | "environment" = "environment") => {
    setError(null);
    setNeedsResume(false);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsStreaming(isStreamAlive(stream));
      setNeedsResume(!isStreamAlive(stream));
    } catch (err) {
      setError(mapCameraError(err));
      setIsStreaming(false);
      setNeedsResume(false);
    }
  }, []);

  const resumeCamera = useCallback(
    async (facingMode: "user" | "environment" = "environment") => startCamera(facingMode),
    [startCamera],
  );

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!isStreaming || !video || !stream || needsResume) return;

    let cancelled = false;
    let detachListeners: (() => void) | undefined;
    video.srcObject = stream;
    detachListeners = attachStreamListeners(stream);

    void video
      .play()
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(mapCameraError(err));
        setNeedsResume(true);
        setIsStreaming(false);
      });

    return () => {
      cancelled = true;
      detachListeners?.();
    };
  }, [attachStreamListeners, isStreaming, needsResume]);

  const capturePhoto = useCallback(async (): Promise<CaptureResult | null> => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !isStreaming || needsResume || !isStreamAlive(stream)) return null;

    const ready = await waitForVideoFrame(video);
    if (!ready || !video.videoWidth || !video.videoHeight) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const binary = atob(dataUrl.split(",")[1] ?? "");
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/jpeg" });
      return {
        blob,
        url: URL.createObjectURL(blob),
        width: canvas.width,
        height: canvas.height,
      };
    } catch {
      return null;
    }
  }, [isStreaming, needsResume]);

  const getActiveStream = useCallback((): MediaStream | null => {
    const stream = streamRef.current;
    if (!stream || !isStreamAlive(stream)) return null;
    return stream;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    videoRef,
    isStreaming,
    needsResume,
    error,
    startCamera,
    resumeCamera,
    stopCamera,
    clearError,
    capturePhoto,
    getActiveStream,
  };
}
