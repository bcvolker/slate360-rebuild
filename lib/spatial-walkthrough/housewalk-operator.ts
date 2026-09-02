import type { OperatorKeyframe } from "./keyframes";
import { interpolateKeyframes, keyframeToPatch, parseKeyframes } from "./keyframes";
import type { OperatorPatch } from "./types";

/** Conservative HouseWalk coverage: operator is behind/below the 360 camera. */
export const HOUSEWALK_OPERATOR_KEYFRAMES: OperatorKeyframe[] = [
  { t: 0, yawCenter: -180, yawWidth: 96, pitchTop: -4, pitchBottom: -88, nadirRadius: 0.38, feather: 0.08, style: "solid" },
  { t: 10, yawCenter: -176, yawWidth: 108, pitchTop: -2, pitchBottom: -88, nadirRadius: 0.4, feather: 0.1, style: "solid" },
  { t: 18, yawCenter: -180, yawWidth: 132, pitchTop: 8, pitchBottom: -88, nadirRadius: 0.44, feather: 0.12, style: "solid" },
  { t: 28, yawCenter: -168, yawWidth: 140, pitchTop: 10, pitchBottom: -88, nadirRadius: 0.46, feather: 0.12, style: "solid" },
  { t: 38, yawCenter: -172, yawWidth: 118, pitchTop: 2, pitchBottom: -88, nadirRadius: 0.4, feather: 0.1, style: "solid" },
  { t: 51, yawCenter: -180, yawWidth: 110, pitchTop: -2, pitchBottom: -88, nadirRadius: 0.4, feather: 0.08, style: "solid" },
];

export function operatorKeyframesFromRaw(raw: unknown): OperatorKeyframe[] {
  if (!raw || typeof raw !== "object") return [];
  return parseKeyframes((raw as { keyframes?: unknown }).keyframes);
}

export function resolvePatchAtTime(
  patch: OperatorPatch | null | undefined,
  keyframes: OperatorKeyframe[] | undefined,
  t: number,
): OperatorPatch | null {
  if (!patch?.enabled && (!keyframes || keyframes.length === 0)) return patch ?? null;
  const frames = keyframes && keyframes.length > 0 ? keyframes : skinnyHouseWalk(patch) ? HOUSEWALK_OPERATOR_KEYFRAMES : [];
  const frame = interpolateKeyframes(frames, t);
  if (!frame) return patch ?? null;
  return {
    ...keyframeToPatch(frame, patch),
    nadirVerticalExtent: Math.max(patch?.nadirVerticalExtent ?? 0.24, 0.34),
    fill: "neutral",
    logoInPatch: true,
    showDate: true,
  };
}

function skinnyHouseWalk(patch: OperatorPatch | null | undefined): boolean {
  return Boolean(patch?.enabled && (patch.rearYawWidth ?? 0) < 48);
}
