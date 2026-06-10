/** Twin capture polish heuristics — tune coverage, pace, level, and ghost here. */

export const TWIN_CAPTURE_POLISH = {
  videoTargetSeconds: 90,
  photoTargetFrames: 150,
  /** deg/s — angular velocity above this triggers SLOW DOWN */
  paceSlowThresholdDegPerSec: 48,
  levelToleranceDeg: 3,
  ghostOpacity: 0.4,
  ghostFadeMs: 1500,
  levelLineOpacity: 0.28,
  levelLineLevelOpacity: 0.42,
  coverageRingWidthPx: 3,
  coveragePillTopGapPx: 8,
} as const;

export type TwinCapturePaceState = "good" | "slow" | null;

export function computeTwinCoverageProgress(args: {
  mode: "video" | "photos";
  isRecording: boolean;
  recSeconds: number;
  activeFrameCount: number;
  totalVideoSeconds: number;
  totalPhotoFrames: number;
}): number {
  if (args.mode === "video") {
    const seconds = args.isRecording ? args.recSeconds : args.totalVideoSeconds;
    return Math.min(1, Math.max(0, seconds / TWIN_CAPTURE_POLISH.videoTargetSeconds));
  }
  const frames = args.isRecording ? args.activeFrameCount : args.totalPhotoFrames;
  return Math.min(1, Math.max(0, frames / TWIN_CAPTURE_POLISH.photoTargetFrames));
}

export function resolveTwinPaceState(
  angularSpeedDegPerSec: number | null,
): TwinCapturePaceState {
  if (angularSpeedDegPerSec === null) return null;
  return angularSpeedDegPerSec > TWIN_CAPTURE_POLISH.paceSlowThresholdDegPerSec ? "slow" : "good";
}

export function isTwinLevelWithinTolerance(rollDeg: number | null): boolean {
  if (rollDeg === null) return false;
  return Math.abs(rollDeg) <= TWIN_CAPTURE_POLISH.levelToleranceDeg;
}
