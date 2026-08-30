import type { OperatorPatch, PatchStyle } from "./types";
import { DEFAULT_OPERATOR_PATCH } from "./types";
import { wrapYaw } from "./redaction";

export type OperatorKeyframe = {
  t: number;
  yawCenter: number;
  yawWidth: number;
  pitchTop: number;
  pitchBottom: number;
  nadirRadius: number;
  feather: number;
  style: PatchStyle;
};

export function parseStyle(v: unknown): PatchStyle {
  return v === "blur" || v === "logo" || v === "solid" ? v : "solid";
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function parseKeyframe(raw: unknown): OperatorKeyframe | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const t = num(o.t ?? o.tSeconds, NaN);
  if (!Number.isFinite(t) || t < 0) return null;
  const pitchBottom = num(o.pitchBottom ?? o.pitchMin, DEFAULT_OPERATOR_PATCH.pitchMin);
  const pitchTop = num(o.pitchTop ?? o.pitchMax, DEFAULT_OPERATOR_PATCH.pitchMax);
  return {
    t,
    yawCenter: wrapYaw(num(o.yawCenter ?? o.rearYawCenter, DEFAULT_OPERATOR_PATCH.rearYawCenter)),
    yawWidth: clamp(num(o.yawWidth ?? o.rearYawWidth, DEFAULT_OPERATOR_PATCH.rearYawWidth), 8, 180),
    pitchTop: clamp(Math.max(pitchTop, pitchBottom), -90, 40),
    pitchBottom: clamp(Math.min(pitchTop, pitchBottom), -90, 0),
    nadirRadius: clamp(num(o.nadirRadius, DEFAULT_OPERATOR_PATCH.nadirRadius), 0.08, 0.6),
    feather: clamp(num(o.feather, 0), 0, 0.25),
    style: parseStyle(o.style),
  };
}

export function parseKeyframes(raw: unknown): OperatorKeyframe[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(parseKeyframe)
    .filter((k): k is OperatorKeyframe => Boolean(k))
    .sort((a, b) => a.t - b.t);
}

export function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

/** Shortest-path yaw lerp across the ±180 seam. */
export function lerpYaw(a: number, b: number, u: number): number {
  const delta = wrapYaw(b - a);
  return wrapYaw(a + delta * u);
}

export function interpolateKeyframes(frames: OperatorKeyframe[], t: number): OperatorKeyframe | null {
  const list = frames.slice().sort((a, b) => a.t - b.t);
  if (list.length === 0) return null;
  if (t <= list[0].t) return { ...list[0], t };
  const last = list[list.length - 1];
  if (t >= last.t) return { ...last, t };
  let i = 0;
  while (i < list.length - 1 && list[i + 1].t < t) i += 1;
  const a = list[i];
  const b = list[i + 1];
  const span = b.t - a.t;
  const u = span <= 0 ? 0 : (t - a.t) / span;
  return {
    t,
    yawCenter: lerpYaw(a.yawCenter, b.yawCenter, u),
    yawWidth: lerp(a.yawWidth, b.yawWidth, u),
    pitchTop: lerp(a.pitchTop, b.pitchTop, u),
    pitchBottom: lerp(a.pitchBottom, b.pitchBottom, u),
    nadirRadius: lerp(a.nadirRadius, b.nadirRadius, u),
    feather: lerp(a.feather, b.feather, u),
    style: u < 0.5 ? a.style : b.style,
  };
}

export function upsertKeyframe(frames: OperatorKeyframe[], next: unknown, epsilon = 0.05): OperatorKeyframe[] {
  const parsed = parseKeyframe(next);
  if (!parsed) return parseKeyframes(frames);
  const kept = parseKeyframes(frames).filter((k) => Math.abs(k.t - parsed.t) > epsilon);
  return [...kept, parsed].sort((a, b) => a.t - b.t);
}

export function removeKeyframeAt(frames: OperatorKeyframe[], t: number, epsilon = 0.05): OperatorKeyframe[] {
  return parseKeyframes(frames).filter((k) => Math.abs(k.t - t) > epsilon);
}

export function nearestKeyframe(frames: OperatorKeyframe[], t: number): OperatorKeyframe | null {
  const list = parseKeyframes(frames);
  if (list.length === 0) return null;
  return list.reduce((best, k) => (Math.abs(k.t - t) < Math.abs(best.t - t) ? k : best));
}

export function prevKeyframe(frames: OperatorKeyframe[], t: number): OperatorKeyframe | null {
  const earlier = parseKeyframes(frames).filter((k) => k.t < t - 0.02);
  return earlier[earlier.length - 1] ?? null;
}

export function nextKeyframe(frames: OperatorKeyframe[], t: number): OperatorKeyframe | null {
  return parseKeyframes(frames).find((k) => k.t > t + 0.02) ?? null;
}

/** Map a legacy static operator patch to a single keyframe covering the clip. */
export function legacyPatchToKeyframe(patch: OperatorPatch, t = 0): OperatorKeyframe {
  return {
    t: patch.tStart ?? t,
    yawCenter: patch.rearYawCenter,
    yawWidth: patch.rearYawWidth,
    pitchTop: patch.pitchMax,
    pitchBottom: patch.pitchMin,
    nadirRadius: patch.nadirRadius,
    feather: 0,
    style: patch.style,
  };
}

export function keyframeToPatch(frame: OperatorKeyframe, base?: OperatorPatch | null): OperatorPatch {
  const seed = base ?? DEFAULT_OPERATOR_PATCH;
  return {
    ...seed,
    enabled: true,
    rearYawCenter: frame.yawCenter,
    rearYawWidth: frame.yawWidth,
    pitchMax: frame.pitchTop,
    pitchMin: frame.pitchBottom,
    nadirRadius: frame.nadirRadius,
    style: frame.style,
  };
}

export function keyframesFromLegacyOrStored(raw: unknown, patch: OperatorPatch | null | undefined): OperatorKeyframe[] {
  const stored = parseKeyframes(raw);
  if (stored.length > 0) return stored;
  if (patch?.enabled) return [legacyPatchToKeyframe(patch)];
  return [];
}

/** One interpolation track per operator-patch redaction row. Regions never merge. */
export function operatorRegions(
  rules: Array<{ id?: string; mode: string; keyframes?: OperatorKeyframe[] }>,
  fallback: OperatorPatch | null | undefined,
): Array<{ id: string; frames: OperatorKeyframe[] }> {
  const rows = rules.filter((r) => r.mode === "operator-patch");
  if (rows.length === 0) {
    const frames = keyframesFromLegacyOrStored([], fallback);
    return frames.length ? [{ id: "legacy", frames }] : [];
  }
  return rows.map((r, i) => ({
    id: r.id ?? `op-${i}`,
    frames: keyframesFromLegacyOrStored(r.keyframes, i === 0 ? fallback : null),
  }));
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
