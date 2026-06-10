"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TwinCaptureBottomRail } from "./TwinCaptureBottomRail";
import { TwinCaptureClipChips } from "./TwinCaptureClipChips";
import { TwinCaptureClipGhost } from "./TwinCaptureClipGhost";
import { TwinCaptureCoveragePill } from "./TwinCaptureCoveragePill";
import { TwinCaptureDebugOverlay } from "./TwinCaptureDebugOverlay";
import { TwinCaptureHudToast } from "./TwinCaptureHudToast";
import { TwinCaptureLidarChip } from "./TwinCaptureLidarChip";
import { TwinCaptureLevelLine } from "./TwinCaptureLevelLine";
import { TwinCaptureLiveCamera } from "./TwinCaptureLiveCamera";
import { TwinCaptureModeSelector } from "./TwinCaptureModeSelector";
import { TwinCaptureTopBar } from "./TwinCaptureTopBar";
import { computeTwinCoverageProgress } from "./twin-capture-polish-tokens";
import {
  getTwinVideoTrack,
  isTwinTorchSupported,
  toggleTwinCaptureTorch,
} from "./twin-capture-torch";
import { useTwinCaptureCamera } from "./useTwinCaptureCamera";
import { useTwinCaptureClipGhost } from "./useTwinCaptureClipGhost";
import { useTwinCaptureDeviceSensors } from "./useTwinCaptureDeviceSensors";
import {
  useTwinCaptureSession,
  type TwinCaptureClipReviewPayload,
  type TwinCaptureMode,
} from "./useTwinCaptureSession";
import { useTwinCaptureVideoRecorder } from "./useTwinCaptureVideoRecorder";
import { isTwinDepthSupported } from "@/lib/digital-twin/twin-capture-device";

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
  debug?: boolean;
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
  debug = false,
}: Props) {
  const camera = useTwinCaptureCamera();
  const videoRecorder = useTwinCaptureVideoRecorder();
  const [toast, setToast] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const sensorsRequestedRef = useRef(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 5000);
  }, []);

  const session = useTwinCaptureSession({
    camera,
    videoRecorder,
    onError: showToast,
    devSeedClipCount,
    devInitialMode,
  });

  const [chromeVisible, setChromeVisible] = useState(true);
  const [lastShutterTapAt, setLastShutterTapAt] = useState<number | null>(null);
  const facingMode = "environment";
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [depthSupported, setDepthSupported] = useState(false);

  const scopeLabel = projectName?.trim() ? projectName.trim().toUpperCase() : "QUICK SCAN";
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
  const streamReady = camera.isStreaming && !camera.needsResume;

  useEffect(() => setDepthSupported(isTwinDepthSupported()), []);
  useEffect(() => {
    if (!streamReady) {
      setTorchSupported(false);
      return;
    }
    const stream = camera.videoRef.current?.srcObject;
    const track = getTwinVideoTrack(stream instanceof MediaStream ? stream : null);
    setTorchSupported(isTwinTorchSupported(track));
  }, [camera.isStreaming, camera.needsResume, camera.videoRef, streamReady]);

  useEffect(() => {
    if (!streamReady && torchOn) setTorchOn(false);
  }, [streamReady, torchOn]);

  useEffect(() => {
    if (videoRecorder.error) showToast(videoRecorder.error);
  }, [showToast, videoRecorder.error]);

  useEffect(() => {
    if (recording) setChromeVisible(true);
  }, [recording]);

  const setChromeVisibleSafe = useCallback(
    (next: boolean | ((value: boolean) => boolean)) => {
      if (recording) return;
      setChromeVisible(next);
    },
    [recording],
  );

  const handleTorchToggle = useCallback(async () => {
    const stream = camera.videoRef.current?.srcObject;
    if (!(stream instanceof MediaStream)) return;
    const next = !torchOn;
    try {
      const ok = await toggleTwinCaptureTorch(stream, next);
      if (ok) setTorchOn(next);
      else showToast("Torch is not available on this device.");
    } catch {
      showToast(next ? "Could not turn torch on." : "Could not turn torch off.");
    }
  }, [camera.videoRef, showToast, torchOn]);

  const handleCancel = useCallback(() => {
    if (session.isRecording) {
      showToast("End the current clip before leaving.");
      return;
    }
    camera.stopCamera();
    onCancel?.();
  }, [camera, onCancel, session.isRecording, showToast]);

  const handleFinish = useCallback(async () => {
    if (finishing || !session.hasContent) return;
    setFinishing(true);
    setFinishError(null);
    try {
      const review = await session.collectForReview();
      camera.stopCamera();
      onFinish?.({
        files: review.allFiles,
        clips: review.clips,
        photoCount,
        videoSeconds,
        estimatedBytes,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not prepare review";
      setFinishError(message);
      showToast(message);
    } finally {
      setFinishing(false);
    }
  }, [camera, estimatedBytes, finishing, onFinish, photoCount, session, showToast, videoSeconds]);

  const handleShutterTap = useCallback(() => {
    setLastShutterTapAt(Date.now());
    if (!sensorsRequestedRef.current) {
      sensorsRequestedRef.current = true;
      void sensors.requestPermission();
    }
    if (camera.needsResume) {
      void camera.resumeCamera(facingMode);
      return;
    }
    ghost.handleShutterTap();
  }, [camera, facingMode, ghost, sensors]);

  const handleCanvasTap = useCallback(() => {
    if (recording) return;
    if (camera.needsResume) {
      void camera.resumeCamera(facingMode);
      return;
    }
    setChromeVisibleSafe((value) => !value);
  }, [camera, facingMode, recording, setChromeVisibleSafe]);

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
        <TwinCaptureLiveCamera
          camera={camera}
          facingMode={facingMode}
          autoStart
          fullBleed
          onResume={() => void camera.resumeCamera(facingMode)}
        />

        <TwinCaptureLevelLine
          rollDeg={sensors.rollDeg}
          supported={sensors.levelLineActive}
        />
        <TwinCaptureClipGhost
          imageUrl={ghost.ghostUrl}
          opacity={ghost.ghostOpacity}
          visible={ghost.ghostVisible}
        />

        <TwinCaptureTopBar
          headerLabel={headerLabel}
          hidden={!chromeVisible}
          onBack={handleCancel}
          onToggleChrome={() => setChromeVisibleSafe((value) => !value)}
        />

        <TwinCaptureHudToast
          message={toast ?? finishError}
          onDismiss={() => {
            setToast(null);
            setFinishError(null);
          }}
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
          recSeconds={session.recSeconds}
          isStreaming={streamReady}
          needsResume={camera.needsResume}
          torchSupported={torchSupported}
          torchOn={torchOn}
          hasContent={session.hasContent}
          finishing={finishing}
          coverageProgress={coverageProgress}
          onTorchToggle={() => void handleTorchToggle()}
          onShutterTap={handleShutterTap}
          onDone={() => void handleFinish()}
        />
      </div>

      {debug ? (
        <TwinCaptureDebugOverlay
          chromeVisible={chromeVisible}
          recording={recording}
          recSeconds={session.recSeconds}
          clipCount={session.clips.length}
          completedClipCount={session.clips.filter(
            (clip) =>
              !clip.recording && (clip.frameCount > 0 || clip.durationSeconds > 0),
          ).length}
          cameraStreaming={camera.isStreaming}
          needsResume={camera.needsResume}
          cameraError={camera.error}
          recorderRecording={videoRecorder.recording}
          recorderError={videoRecorder.error}
          sensorPermission={sensors.permission}
          levelLineActive={sensors.levelLineActive}
          lastOrientationEventAt={sensors.lastOrientationEventAt}
          ghostFrameCaptured={ghost.ghostDebug.ghostFrameCaptured}
          ghostFrameByteSize={ghost.ghostDebug.ghostFrameByteSize}
          ghostMounted={ghost.ghostDebug.ghostMounted}
          lastFrameCaptureAt={ghost.ghostDebug.lastFrameCaptureAt}
          lastShutterTapAt={lastShutterTapAt}
        />
      ) : null}
    </div>
  );
}
