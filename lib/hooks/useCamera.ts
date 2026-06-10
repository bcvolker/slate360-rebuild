"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const HAVE_CURRENT_DATA = 2;

type CaptureResult = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
};

type UseCameraReturn = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  streamRef: React.RefObject<MediaStream | null>;
  isStreaming: boolean;
  streamAlive: boolean;
  videoAttached: boolean;
  needsUserResume: boolean;
  hasLiveFrames: boolean;
  error: string | null;
  startCamera: (facingMode?: "user" | "environment") => Promise<void>;
  stopCamera: () => void;
  detachVideo: () => void;
  reattachVideo: () => Promise<boolean>;
  clearError: () => void;
  capturePhoto: () => CaptureResult | null;
};

function mapCameraError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return "Camera permission denied. Allow camera access in Settings, then tap Retry.";
    }
    if (err.name === "NotFoundError") {
      return "No camera found on this device.";
    }
    if (err.name === "NotReadableError") {
      return "Camera is in use by another app. Close it and tap Retry.";
    }
    if (err.name === "OverconstrainedError") {
      return "This camera mode is not available on this device.";
    }
  }
  return err instanceof Error ? err.message : "Camera unavailable";
}

function videoHasLiveFrames(video: HTMLVideoElement | null): boolean {
  if (!video) return false;
  return video.readyState >= HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0;
}

function streamTracksLive(stream: MediaStream | null): boolean {
  if (!stream) return false;
  const tracks = stream.getVideoTracks();
  return tracks.length > 0 && tracks.some((track) => track.readyState === "live");
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackEndedHandlerRef = useRef<(() => void) | null>(null);
  const pendingAttachRef = useRef(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamAlive, setStreamAlive] = useState(false);
  const [videoAttached, setVideoAttached] = useState(false);
  const [needsUserResume, setNeedsUserResume] = useState(false);
  const [hasLiveFrames, setHasLiveFrames] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markStreamDead = useCallback(() => {
    setStreamAlive(false);
    setIsStreaming(false);
    setVideoAttached(false);
    setNeedsUserResume(true);
    setHasLiveFrames(false);
  }, []);

  const bindStreamListeners = useCallback(
    (stream: MediaStream) => {
      const track = stream.getVideoTracks()[0];
      if (!track) return;
      if (trackEndedHandlerRef.current) {
        track.removeEventListener("ended", trackEndedHandlerRef.current);
      }
      const onEnded = () => markStreamDead();
      trackEndedHandlerRef.current = onEnded;
      track.addEventListener("ended", onEnded);
    },
    [markStreamDead],
  );

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track && trackEndedHandlerRef.current) {
        track.removeEventListener("ended", trackEndedHandlerRef.current);
      }
      stream.getTracks().forEach((entry) => entry.stop());
    }
    trackEndedHandlerRef.current = null;
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setStreamAlive(false);
    setVideoAttached(false);
    setNeedsUserResume(false);
    setHasLiveFrames(false);
  }, []);

  const detachVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setVideoAttached(false);
    setHasLiveFrames(false);
  }, []);

  const reattachVideo = useCallback(async (): Promise<boolean> => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!stream || !streamTracksLive(stream)) {
      markStreamDead();
      return false;
    }
    if (!video) {
      pendingAttachRef.current = true;
      return false;
    }

    pendingAttachRef.current = false;
    video.srcObject = stream;
    setVideoAttached(true);
    setIsStreaming(true);
    setStreamAlive(true);
    setNeedsUserResume(false);

    try {
      await video.play();
      setError(null);
      setHasLiveFrames(videoHasLiveFrames(video));
      return true;
    } catch (err) {
      setError(mapCameraError(err));
      setHasLiveFrames(false);
      return false;
    }
  }, [markStreamDead]);

  const startCamera = useCallback(
    async (facingMode: "user" | "environment" = "environment") => {
      setError(null);
      setNeedsUserResume(false);

      if (streamRef.current && streamTracksLive(streamRef.current)) {
        setIsStreaming(true);
        setStreamAlive(true);
        if (videoRef.current && !videoRef.current.srcObject) {
          await reattachVideo();
        } else {
          setVideoAttached(Boolean(videoRef.current?.srcObject));
          setHasLiveFrames(videoHasLiveFrames(videoRef.current));
        }
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsStreaming(false);
      setStreamAlive(false);
      setVideoAttached(false);
      setHasLiveFrames(false);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        bindStreamListeners(stream);
        setIsStreaming(true);
        setStreamAlive(true);
        setNeedsUserResume(false);
        if (videoRef.current) {
          await reattachVideo();
        } else {
          pendingAttachRef.current = true;
        }
      } catch (err) {
        setError(mapCameraError(err));
        setIsStreaming(false);
        setStreamAlive(false);
        setNeedsUserResume(true);
      }
    },
    [bindStreamListeners, reattachVideo],
  );

  useEffect(() => {
    if (!streamAlive || !streamRef.current || !streamTracksLive(streamRef.current)) return;
    const video = videoRef.current;
    if (video?.srcObject) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 60;

    const tryAttach = () => {
      if (cancelled) return;
      const node = videoRef.current;
      const stream = streamRef.current;
      if (node && stream && streamTracksLive(stream) && !node.srcObject) {
        pendingAttachRef.current = false;
        void reattachVideo();
        return;
      }
      attempts += 1;
      if (attempts < maxAttempts && stream && streamTracksLive(stream)) {
        window.setTimeout(tryAttach, 50);
      }
    };

    tryAttach();

    return () => {
      cancelled = true;
    };
  }, [streamAlive, reattachVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoAttached || !streamRef.current) return;

    let cancelled = false;
    const syncFrames = () => {
      if (!cancelled) setHasLiveFrames(videoHasLiveFrames(video));
    };

    video.addEventListener("loadeddata", syncFrames);
    video.addEventListener("resize", syncFrames);
    syncFrames();

    const interval = window.setInterval(syncFrames, 400);

    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", syncFrames);
      video.removeEventListener("resize", syncFrames);
      window.clearInterval(interval);
    };
  }, [videoAttached, isStreaming]);

  const capturePhoto = useCallback((): CaptureResult | null => {
    const video = videoRef.current;
    if (!video || !streamTracksLive(streamRef.current) || !videoHasLiveFrames(video)) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const binary = atob(dataUrl.split(",")[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "image/jpeg" });

    return {
      blob,
      url: URL.createObjectURL(blob),
      width: canvas.width,
      height: canvas.height,
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    videoRef,
    streamRef,
    isStreaming,
    streamAlive,
    videoAttached,
    needsUserResume,
    hasLiveFrames,
    error,
    startCamera,
    stopCamera,
    detachVideo,
    reattachVideo,
    clearError,
    capturePhoto,
  };
}
