"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TwinCaptureClip } from "./useTwinCaptureSession";
import { TWIN_CAPTURE_POLISH } from "./twin-capture-polish-tokens";
import {
  estimateTwinCaptureDataUrlBytes,
  grabTwinCaptureVideoFrame,
} from "./twin-capture-frame-grab";

type Args = {
  clips: TwinCaptureClip[];
  isRecording: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onShutterTap: () => void;
  devGhostFrameUrl?: string | null;
  devForceGhost?: boolean;
};

export type TwinCaptureGhostDebug = {
  ghostFrameCaptured: boolean;
  ghostFrameByteSize: number;
  ghostMounted: boolean;
  lastFrameCaptureAt: number | null;
};

function countCompletedClips(clips: TwinCaptureClip[]): number {
  return clips.filter(
    (clip) => !clip.recording && (clip.frameCount > 0 || clip.durationSeconds > 0),
  ).length;
}

function captureGhostFrameWithRetry(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onResult: (frame: string | null) => void,
  attempt = 0,
) {
  const frame = grabTwinCaptureVideoFrame(videoRef.current);
  if (frame) {
    onResult(frame);
    return;
  }
  if (attempt >= 10) {
    onResult(null);
    return;
  }
  const delayMs = attempt < 4 ? 32 : 80;
  window.setTimeout(() => {
    captureGhostFrameWithRetry(videoRef, onResult, attempt + 1);
  }, delayMs);
}

export function useTwinCaptureClipGhost({
  clips,
  isRecording,
  videoRef,
  onShutterTap,
  devGhostFrameUrl = null,
  devForceGhost = false,
}: Args) {
  const lastFrameRef = useRef<string | null>(devGhostFrameUrl);
  const prevIsRecordingRef = useRef(isRecording);
  const isRecordingRef = useRef(isRecording);
  const clipsRef = useRef(clips);
  isRecordingRef.current = isRecording;
  clipsRef.current = clips;
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ghostUrl, setGhostUrl] = useState<string | null>(devForceGhost ? devGhostFrameUrl : null);
  const [ghostOpacity, setGhostOpacity] = useState(
    devForceGhost ? TWIN_CAPTURE_POLISH.ghostOpacity : 0,
  );
  const [ghostDebug, setGhostDebug] = useState<TwinCaptureGhostDebug>({
    ghostFrameCaptured: Boolean(devGhostFrameUrl),
    ghostFrameByteSize: devGhostFrameUrl ? estimateTwinCaptureDataUrlBytes(devGhostFrameUrl) : 0,
    ghostMounted: Boolean(devForceGhost && devGhostFrameUrl),
    lastFrameCaptureAt: null,
  });

  const clearGhostTimers = useCallback(() => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    fadeTimerRef.current = null;
    hideTimerRef.current = null;
  }, []);

  const showGhost = useCallback(
    (url: string) => {
      clearGhostTimers();
      setGhostUrl(url);
      setGhostOpacity(TWIN_CAPTURE_POLISH.ghostOpacity);
    },
    [clearGhostTimers],
  );

  const applyFrameCapture = useCallback(
    (frame: string | null) => {
      if (frame) lastFrameRef.current = frame;
      setGhostDebug((prev) => ({
        ...prev,
        ghostFrameCaptured: Boolean(frame),
        ghostFrameByteSize: frame ? estimateTwinCaptureDataUrlBytes(frame) : 0,
        lastFrameCaptureAt: frame ? Date.now() : prev.lastFrameCaptureAt,
      }));
      if (frame && isRecordingRef.current && countCompletedClips(clipsRef.current) >= 1) {
        showGhost(frame);
      }
    },
    [showGhost],
  );

  useEffect(() => {
    if (devGhostFrameUrl) lastFrameRef.current = devGhostFrameUrl;
  }, [devGhostFrameUrl]);

  useEffect(() => {
    if (!devForceGhost) return;
    setGhostUrl(devGhostFrameUrl);
    setGhostOpacity(TWIN_CAPTURE_POLISH.ghostOpacity);
  }, [devForceGhost, devGhostFrameUrl]);

  useEffect(() => () => clearGhostTimers(), [clearGhostTimers]);

  const handleShutterTap = useCallback(() => {
    onShutterTap();
  }, [onShutterTap]);

  useEffect(() => {
    const wasRecording = prevIsRecordingRef.current;
    prevIsRecordingRef.current = isRecording;

    if (wasRecording && !isRecording) {
      captureGhostFrameWithRetry(videoRef, applyFrameCapture);
    }
  }, [applyFrameCapture, isRecording, videoRef]);

  useEffect(() => {
    const completed = countCompletedClips(clips);

    if (isRecording && completed >= 1 && lastFrameRef.current) {
      showGhost(lastFrameRef.current);
      return;
    }

    if (!isRecording && ghostUrl) {
      clearGhostTimers();
      fadeTimerRef.current = setTimeout(() => {
        setGhostOpacity(0);
      }, TWIN_CAPTURE_POLISH.ghostFadeMs);
      hideTimerRef.current = setTimeout(() => {
        setGhostUrl(null);
      }, TWIN_CAPTURE_POLISH.ghostFadeMs + 320);
    }
  }, [clearGhostTimers, clips, ghostUrl, isRecording, showGhost]);

  const ghostVisible = Boolean(ghostUrl && ghostOpacity > 0.01);

  useEffect(() => {
    setGhostDebug((prev) => ({ ...prev, ghostMounted: ghostVisible }));
  }, [ghostVisible]);

  return { ghostUrl, ghostOpacity, ghostVisible, handleShutterTap, ghostDebug };
}
