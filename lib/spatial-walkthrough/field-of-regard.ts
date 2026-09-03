import { interpolateKeyframes, type OperatorKeyframe } from "./keyframes";
import { wrapYaw } from "./redaction";
import type { OperatorPatch } from "./types";

export type FieldOfRegard = {
  operatorYawCenter: number;
  operatorYawWidth: number;
  pitchMin: number;
  pitchMax: number;
};

export function fieldOfRegardAt(
  t: number,
  keyframes: OperatorKeyframe[],
  fallback?: OperatorPatch | null,
): FieldOfRegard | null {
  const frame = interpolateKeyframes(keyframes, t);
  if (frame) {
    return {
      operatorYawCenter: frame.yawCenter,
      operatorYawWidth: frame.yawWidth,
      pitchMin: frame.pitchBottom,
      pitchMax: frame.pitchTop,
    };
  }
  if (!fallback?.enabled) return null;
  return {
    operatorYawCenter: fallback.rearYawCenter,
    operatorYawWidth: fallback.rearYawWidth,
    pitchMin: fallback.pitchMin,
    pitchMax: fallback.pitchMax,
  };
}

export function yawInOperatorSector(yaw: number, regard: FieldOfRegard): boolean {
  const half = regard.operatorYawWidth / 2;
  const min = wrapYaw(regard.operatorYawCenter - half);
  const max = wrapYaw(regard.operatorYawCenter + half);
  const y = wrapYaw(yaw);
  if (min <= max) return y >= min && y <= max;
  return y >= min || y <= max;
}

/** Soft-stop: snap to the nearer allowed edge. Never locks the whole sphere. */
export function clampViewToRegard(
  yaw: number,
  pitch: number,
  regard: FieldOfRegard | null,
): { yaw: number; pitch: number; clamped: boolean } {
  if (!regard || regard.operatorYawWidth >= 170) {
    return { yaw: wrapYaw(yaw), pitch, clamped: false };
  }
  let nextYaw = wrapYaw(yaw);
  let nextPitch = pitch;
  let clamped = false;
  if (yawInOperatorSector(nextYaw, regard)) {
    const half = regard.operatorYawWidth / 2;
    const left = wrapYaw(regard.operatorYawCenter - half);
    const right = wrapYaw(regard.operatorYawCenter + half);
    const dLeft = Math.abs(wrapYaw(nextYaw - left));
    const dRight = Math.abs(wrapYaw(nextYaw - right));
    const outward = 0.8;
    nextYaw = dLeft <= dRight ? wrapYaw(left - outward) : wrapYaw(right + outward);
    clamped = true;
  }
  if (pitch >= regard.pitchMin && pitch <= regard.pitchMax && yawInOperatorSector(nextYaw, regard)) {
    nextPitch = pitch > 0 ? regard.pitchMax : regard.pitchMin;
    clamped = true;
  }
  return { yaw: nextYaw, pitch: nextPitch, clamped };
}

export function waypointHiddenByOperator(
  yaw: number,
  pitch: number,
  regard: FieldOfRegard | null,
): boolean {
  if (!regard) return false;
  return yawInOperatorSector(yaw, regard) && pitch >= regard.pitchMin && pitch <= regard.pitchMax;
}

export const COVERAGE_REQUIRED = "Coverage required — this area is hidden by operator.";
export const COVERAGE_TOO_LIMITED =
  "Capture coverage is too limited — use another view or skip this segment.";

/** Presentation pad so baked operator pixels stay outside a client FOV, not just the look center. */
export const CLIENT_YAW_PAD = 32;
export const CLIENT_PITCH_PAD = 10;
/** Modest extra above the baked operator top. Paired with client maxFov 42. */
export const CLIENT_HALF_FOV = 16;

export function presentationRegard(regard: FieldOfRegard): FieldOfRegard {
  return {
    ...regard,
    operatorYawWidth: Math.min(168, regard.operatorYawWidth + CLIENT_YAW_PAD * 2),
    pitchMax: regard.pitchMax + CLIENT_PITCH_PAD,
  };
}

export type VisibleRangePair = {
  horizontal: [string, string];
  vertical: [string, string];
};

/** Allowed sphere = complement of the operator sector. One contiguous PSV range. */
export function allowedVisibleRange(regard: FieldOfRegard | null): VisibleRangePair | null {
  if (!regard || regard.operatorYawWidth >= 170) return null;
  const presented = presentationRegard(regard);
  const half = presented.operatorYawWidth / 2;
  const left = wrapYaw(presented.operatorYawCenter - half);
  const right = wrapYaw(presented.operatorYawCenter + half);
  const floor = Math.min(30, Math.max(16, presented.pitchMax + CLIENT_HALF_FOV));
  return {
    horizontal: [`${right}deg`, `${left}deg`],
    vertical: [`${floor}deg`, "78deg"],
  };
}

export function coverageTooLimited(regard: FieldOfRegard | null): boolean {
  return Boolean(regard && regard.operatorYawWidth > 140);
}
