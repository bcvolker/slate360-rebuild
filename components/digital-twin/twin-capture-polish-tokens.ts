/** Twin capture polish heuristics — tune coverage, guide, level, and ghost here. */

export const TWIN_CAPTURE_POLISH = {
  videoTargetSeconds: 90,
  photoTargetFrames: 150,
  levelToleranceDeg: 3,
  ghostOpacity: 0.45,
  ghostFadeMs: 1500,
  levelLineOpacity: 0.62,
  levelLineLevelOpacity: 0.82,
  coverageRingWidthPx: 3,
  guideTopGapPx: 8,
} as const;

/** Capture Guide sensor thresholds — field-tune via these named constants. */
export const TWIN_CAPTURE_GUIDE = {
  ringSizePx: 44,
  ringStrokePx: 3,
  updateIntervalMs: 220,
  stateHysteresisMs: 1000,
  goodDimAfterMs: 10_000,
  goodDimOpacity: 0.5,
  windowSamples: 18,
  /** m/s² variance — walking too fast raises acceleration magnitude spread */
  paceVarianceWarn: 0.65,
  paceVarianceSevere: 1.8,
  /** (deg/s)² variance — hand shake raises gyro rotation-rate spread */
  stabilityVarianceWarn: 90,
  stabilityVarianceSevere: 320,
  /** Level bubble damping — EMA factor + display throttle keep it calm */
  rollSmoothingAlpha: 0.12,
  rollUpdateIntervalMs: 33,
  rollDeadbandDeg: 1.25,
  rollMaxDeg: 15,
  bubbleTrackWidthPx: 150,
  bubbleTrackHeightPx: 26,
  bubbleSizePx: 14,
  bubblePxPerDeg: 4.2,
} as const;

export type TwinCaptureGuideState =
  | "good"
  | "slow_down"
  | "slow_down_severe"
  | "hold_steady"
  | "hold_steady_severe"
  | null;

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
  return angularSpeedDegPerSec > 48 ? "slow" : "good";
}

export function resolveTwinGuideState(
  paceVariance: number,
  stabilityVariance: number,
): Exclude<TwinCaptureGuideState, null> {
  if (stabilityVariance >= TWIN_CAPTURE_GUIDE.stabilityVarianceSevere) return "hold_steady_severe";
  if (stabilityVariance >= TWIN_CAPTURE_GUIDE.stabilityVarianceWarn) return "hold_steady";
  if (paceVariance >= TWIN_CAPTURE_GUIDE.paceVarianceSevere) return "slow_down_severe";
  if (paceVariance >= TWIN_CAPTURE_GUIDE.paceVarianceWarn) return "slow_down";
  return "good";
}

export function twinGuideStateLabel(state: TwinCaptureGuideState): string | null {
  if (!state) return null;
  if (state === "good") return "SMOOTH · KEEP GOING";
  if (state.startsWith("slow_down")) return "SLOW DOWN";
  return "HOLD STEADY";
}

export function twinGuideStateColor(state: TwinCaptureGuideState): string {
  // Tokens only — no hardcoded hex, and NO amber (design-system ban). Caution = muted-graphite.
  if (!state || state === "good") return "var(--graphite-primary)";
  if (state.endsWith("_severe")) return "var(--destructive)";
  return "var(--muted-foreground)";
}

export function isTwinLevelWithinTolerance(rollDeg: number | null): boolean {
  if (rollDeg === null) return false;
  return Math.abs(rollDeg) <= TWIN_CAPTURE_POLISH.levelToleranceDeg;
}
