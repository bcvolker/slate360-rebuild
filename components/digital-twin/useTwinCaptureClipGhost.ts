"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TwinCaptureClip } from "./useTwinCaptureSession";
import { TWIN_CAPTURE_POLISH } from "./twin-capture-polish-tokens";
import { grabTwinCaptureVideoFrame } from "./twin-capture-frame-grab";

type Args = {
  clips: TwinCaptureClip[];
  isRecording: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onShutterTap: () => void;
  devGhostFrameUrl?: string | null;
  devForceGhost?: boolean;
};

function countCompletedClips(clips: TwinCaptureClip[]): number {
  return clips.filter(
    (clip) => !clip.recording && (clip.frameCount > 0 || clip.durationSeconds > 0),
  ).length;
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
  const wasRecordingRef = useRef(isRecording);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ghostUrl, setGhostUrl] = useState<string | null>(devForceGhost ? devGhostFrameUrl : null);
  const [ghostOpacity, setGhostOpacity] = useState(devForceGhost ? TWIN_CAPTURE_POLISH.ghostOpacity : 0);

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

  const handleShutterTap = useCallback(() => {
    const wasRecording = wasRecordingRef.current;
    const completedBefore = countCompletedClips(clips);

    if (wasRecording) {
      const frame = grabTwinCaptureVideoFrame(videoRef.current);
      if (frame) lastFrameRef.current = frame;
    }

    onShutterTap();

    if (!wasRecording && completedBefore >= 1 && lastFrameRef.current) {
      clearGhostTimers();
      setGhostUrl(lastFrameRef.current);
      setGhostOpacity(TWIN_CAPTURE_POLISH.ghostOpacity);
      fadeTimerRef.current = setTimeout(() => {
        setGhostOpacity(0);
      }, TWIN_CAPTURE_POLISH.ghostFadeMs);
      hideTimerRef.current = setTimeout(() => {
        setGhostUrl(null);
      }, TWIN_CAPTURE_POLISH.ghostFadeMs + 320);
    }
  }, [clearGhostTimers, clips, onShutterTap, videoRef]);

  useEffect(() => {
    wasRecordingRef.current = isRecording;
  }, [isRecording]);

  const ghostVisible = Boolean(ghostUrl && ghostOpacity > 0.01);

  return { ghostUrl, ghostOpacity, ghostVisible, handleShutterTap };
}
