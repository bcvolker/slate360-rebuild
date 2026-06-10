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

function captureGhostFrame(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onResult: (frame: string | null) => void,
) {
  const immediate = grabTwinCaptureVideoFrame(videoRef.current);
  if (immediate) {
    onResult(immediate);
    return;
  }
  requestAnimationFrame(() => {
    onResult(grabTwinCaptureVideoFrame(videoRef.current));
  });
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

  const applyFrameCapture = useCallback((frame: string | null) => {
    if (frame) lastFrameRef.current = frame;
    setGhostDebug((prev) => ({
      ...prev,
      ghostFrameCaptured: Boolean(frame),
      ghostFrameByteSize: frame ? estimateTwinCaptureDataUrlBytes(frame) : 0,
      lastFrameCaptureAt: frame ? Date.now() : prev.lastFrameCaptureAt,
    }));
  }, []);

  useEffect(() => {
    if (devGhostFrameUrl) lastFrameRef.current = devGhostFrameUrl;
  }, [devGhostFrameUrl]);

  useEffect(() => {
    if (!devForceGhost) return;
    setGhostUrl(devGhostFrameUrl);
    setGhostOpacity(TWIN_CAPTURE_POLISH.ghostOpacity);
  }, [devForceGhost, devGhostFrameUrl]);

  const clearGhostTimers = useCallback(() => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    fadeTimerRef.current = null;
    hideTimerRef.current = null;
  }, []);

  useEffect(() => () => clearGhostTimers(), [clearGhostTimers]);

  const showGhost = useCallback(
    (url: string) => {
      clearGhostTimers();
      setGhostUrl(url);
      setGhostOpacity(TWIN_CAPTURE_POLISH.ghostOpacity);
    },
    [clearGhostTimers],
  );

  const handleShutterTap = useCallback(() => {
    const wasRecording = prevIsRecordingRef.current;
    const completedBefore = countCompletedClips(clips);

    if (wasRecording) {
      captureGhostFrame(videoRef, applyFrameCapture);
    }

    onShutterTap();

    if (!wasRecording && completedBefore >= 1 && lastFrameRef.current) {
      showGhost(lastFrameRef.current);
    }
  }, [applyFrameCapture, clips, onShutterTap, showGhost, videoRef]);

  useEffect(() => {
    const wasRecording = prevIsRecordingRef.current;
    prevIsRecordingRef.current = isRecording;

    if (wasRecording && !isRecording) {
      captureGhostFrame(videoRef, applyFrameCapture);
    }
  }, [applyFrameCapture, isRecording, videoRef]);

  useEffect(() => {
    if (isRecording && countCompletedClips(clips) >= 1 && lastFrameRef.current) {
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
