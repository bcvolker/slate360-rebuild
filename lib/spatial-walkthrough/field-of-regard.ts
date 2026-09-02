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
