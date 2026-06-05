"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CaptureResult = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
};

type UseCameraReturn = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isStreaming: boolean;
  error: string | null;
  startCamera: (facingMode?: "user" | "environment") => Promise<void>;
  stopCamera: () => void;
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

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const startCamera = useCallback(async (facingMode: "user" | "environment" = "environment") => {
    setError(null);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsStreaming(true);
    } catch (err) {
      setError(mapCameraError(err));
      setIsStreaming(false);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!isStreaming || !video || !stream) return;

    let cancelled = false;
    video.srcObject = stream;

    void video
      .play()
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(mapCameraError(err));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        video.srcObject = null;
        setIsStreaming(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isStreaming]);

  const capturePhoto = useCallback((): CaptureResult | null => {
    const video = videoRef.current;
    if (!video || !isStreaming) return null;

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
  }, [isStreaming]);

  return { videoRef, isStreaming, error, startCamera, stopCamera, capturePhoto };
}
