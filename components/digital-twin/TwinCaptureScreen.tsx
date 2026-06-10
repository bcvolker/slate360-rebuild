"use client";

import { useCallback, useEffect, useState } from "react";
import { useCamera } from "@/lib/hooks/useCamera";
import { useTwinVideoRecorder } from "@/hooks/useTwinVideoRecorder";
import {
  useTwinCaptureSession,
  type TwinCaptureClipReviewPayload,
  type TwinCaptureMode,
} from "@/hooks/useTwinCaptureSession";
import {
  getTwinVideoTrack,
  isTwinDepthSupported,
  isTwinTorchSupported,
  setTwinTorch,
} from "@/lib/digital-twin/twin-capture-device";
import { TwinCaptureBottomRail } from "./TwinCaptureBottomRail";
import { TwinCaptureClipChips } from "./TwinCaptureClipChips";
import { TwinCaptureClipGhost } from "./TwinCaptureClipGhost";
import { TwinCaptureCoveragePill } from "./TwinCaptureCoveragePill";
import { TwinCaptureLidarChip } from "./TwinCaptureLidarChip";
import { TwinCaptureLevelLine } from "./TwinCaptureLevelLine";
import { TwinCaptureLiveCamera } from "./TwinCaptureLiveCamera";
import { TwinCaptureModeSelector } from "./TwinCaptureModeSelector";
import { TwinCaptureTopBar } from "./TwinCaptureTopBar";
import { computeTwinCoverageProgress } from "./twin-capture-polish-tokens";
import { useTwinCaptureClipGhost } from "./useTwinCaptureClipGhost";
import { useTwinCaptureDeviceSensors } from "./useTwinCaptureDeviceSensors";

export type TwinCaptureFinishResult = {
  files: File[];
  clips: TwinCaptureClipReviewPayload[];
  photoCount: number;
  videoSeconds: number;
  estimatedBytes: number;
};

type Props = {
  projectName?: string | null;
  spaceName?: string;
  onCancel?: () => void;
  onFinish?: (result: TwinCaptureFinishResult) => void;
  devSeedClipCount?: number;
  devInitialMode?: TwinCaptureMode;
  devForceRecording?: boolean;
  devCoverageOverride?: number | null;
  devRollOverride?: number | null;
  devMotionOverride?: number | null;
  devForceGhost?: boolean;
  devGhostFrameUrl?: string | null;
};

const PHOTO_EST_BYTES = 2_400_000;
const VIDEO_EST_BYTES_PER_SEC = 1_850_000;

function formatRecTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TwinCaptureScreen({
  projectName,
  spaceName = "Lobby — Level 1",
  onCancel,
  onFinish,
  devSeedClipCount,
  devInitialMode,
  devForceRecording,
  devCoverageOverride = null,
  devRollOverride = null,
  devMotionOverride = null,
  devForceGhost = false,
  devGhostFrameUrl = null,
}: Props) {
  const camera = useCamera();
  const videoRecorder = useTwinVideoRecorder();
  const session = useTwinCaptureSession({
    camera,
    videoRecorder,
    devSeedClipCount,
    devInitialMode,
  });
  const [chromeVisible, setChromeVisible] = useState(true);
  const facingMode = "environment";
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [depthSupported, setDepthSupported] = useState(false);

  const scopeLabel = projectName?.trim()
    ? projectName.trim().toUpperCase()
    : "QUICK SCAN";
  const recording = devForceRecording || session.isRecording;
  const headerLabel = recording
    ? `${scopeLabel} · REC ${formatRecTimer(session.recSeconds)}`
    : `${scopeLabel} · READY`;

  const photoCount = session.clips.reduce((sum, clip) => sum + clip.frameCount, 0);
  const videoSeconds = session.clips
    .filter((clip) => clip.mode === "video")
    .reduce((sum, clip) => sum + clip.durationSeconds, 0);
  const activeFrameCount = session.activeClip?.frameCount ?? 0;

  const coverageProgress =
    devCoverageOverride ??
    computeTwinCoverageProgress({
      mode: session.mode,
      isRecording: recording,
      recSeconds: session.recSeconds,
      activeFrameCount,
      totalVideoSeconds: videoSeconds,
      totalPhotoFrames: photoCount,
    });
  const coveragePct = Math.round(coverageProgress * 100);

  const sensors = useTwinCaptureDeviceSensors({
    devRollOverride,
    devMotionSpeedOverride: devMotionOverride,
  });

  const ghost = useTwinCaptureClipGhost({
    clips: session.clips,
    isRecording: recording,
    videoRef: camera.videoRef,
    onShutterTap: session.handleShutterTap,
    devGhostFrameUrl,
    devForceGhost,
  });
  const estimatedBytes = photoCount * PHOTO_EST_BYTES + videoSeconds * VIDEO_EST_BYTES_PER_SEC;

  useEffect(() => {
    setDepthSupported(isTwinDepthSupported());
  }, []);

  useEffect(() => {
    if (!camera.isStreaming) {
      setTorchSupported(false);
      return;
    }
    const stream = camera.videoRef.current?.srcObject;
    const track = getTwinVideoTrack(stream instanceof MediaStream ? stream : null);
    setTorchSupported(isTwinTorchSupported(track));
  }, [camera.isStreaming, camera.videoRef]);

  const handleTorchToggle = useCallback(async () => {
    const stream = camera.videoRef.current?.srcObject;
    const track = getTwinVideoTrack(stream instanceof MediaStream ? stream : null);
    if (!track) return;
    const next = !torchOn;
    try {
      await setTwinTorch(track, next);
      setTorchOn(next);
    } catch {
      setTorchOn(false);
    }
  }, [camera.videoRef, torchOn]);

  const handleCancel = useCallback(() => {
    camera.stopCamera();
    onCancel?.();
  }, [camera, onCancel]);

  const handleFinish = useCallback(async () => {
    const review = await session.collectForReview();
    camera.stopCamera();
    onFinish?.({
      files: review.allFiles,
      clips: review.clips,
      photoCount,
      videoSeconds,
      estimatedBytes,
    });
  }, [camera, estimatedBytes, onFinish, photoCount, session, videoSeconds]);

  const handleCanvasTap = useCallback(() => {
    if (recording) return;
    setChromeVisible((value) => !value);
  }, [recording]);

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--graphite-canvas)] touch-manipulation select-none"
      data-twin-capture-screen
    >
      <div
        role={recording ? undefined : "button"}
        tabIndex={recording ? undefined : 0}
        className="relative min-h-0 flex-1 overflow-hidden"
        onClick={recording ? undefined : handleCanvasTap}
        onKeyDown={
          recording
            ? undefined
            : (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleCanvasTap();
                }
              }
        }
        aria-label={recording ? undefined : "Toggle capture controls"}
      >
        <TwinCaptureLiveCamera camera={camera} facingMode={facingMode} autoStart fullBleed />

        <TwinCaptureLevelLine rollDeg={sensors.rollDeg} supported={sensors.orientationSupported} />
        <TwinCaptureClipGhost
          imageUrl={ghost.ghostUrl}
          opacity={ghost.ghostOpacity}
          visible={ghost.ghostVisible}
        />

        <TwinCaptureTopBar
          headerLabel={headerLabel}
          hidden={!chromeVisible}
          onBack={handleCancel}
          onToggleChrome={() => setChromeVisible((value) => !value)}
        />

        <TwinCaptureLidarChip hidden={!chromeVisible} visible={depthSupported} />

        <TwinCaptureCoveragePill
          hidden={!chromeVisible}
          coveragePct={coveragePct}
          paceState={sensors.paceState}
        />

        <TwinCaptureClipChips
          hidden={!chromeVisible}
          clips={session.clips}
          activeClipId={session.activeClipId}
        />

        <TwinCaptureModeSelector
          hidden={!chromeVisible}
          mode={session.mode}
          photoInterval={session.photoInterval}
          modeLocked={recording}
          onModeChange={session.handleModeChange}
          onCycleInterval={session.cyclePhotoInterval}
        />

        <TwinCaptureBottomRail
          hidden={!chromeVisible}
          mode={session.mode}
          isRecording={recording}
          isStreaming={camera.isStreaming}
          torchSupported={torchSupported}
          torchOn={torchOn}
          hasContent={session.hasContent}
          coverageProgress={coverageProgress}
          onTorchToggle={() => void handleTorchToggle()}
          onShutterTap={ghost.handleShutterTap}
          onDone={() => void handleFinish()}
        />
      </div>

    </div>
  );
}
