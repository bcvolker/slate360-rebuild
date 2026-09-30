import { lerp, lerpYaw } from "./keyframes";
import { wrapYaw } from "./redaction";

export const OEM_GYRO_NOTE = "OEM gyro/FlowState preferred";

export type OrientationKeyframe = {
  t: number;
  rollDeg: number;
  pitchDeg: number;
  yawDeg: number;
};

export type OrientationTrack = {
  source: "manual" | "oem";
  keyframes: OrientationKeyframe[];
  /** True when CLIENT/PUBLIC derivatives should receive a baked correction. */
  bakeable: boolean;
};

export function parseOrientationKeyframe(raw: unknown): OrientationKeyframe | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const t = typeof o.t === "number" && Number.isFinite(o.t) ? o.t : NaN;
  if (!Number.isFinite(t) || t < 0) return null;
  return {
    t,
    rollDeg: clamp(num(o.rollDeg), -45, 45),
    pitchDeg: clamp(num(o.pitchDeg), -45, 45),
    yawDeg: wrapYaw(num(o.yawDeg)),
  };
}

export function parseOrientationTrack(raw: unknown): OrientationTrack {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const frames = Array.isArray(o.keyframes)
    ? o.keyframes.map(parseOrientationKeyframe).filter((k): k is OrientationKeyframe => Boolean(k)).sort((a, b) => a.t - b.t)
    : [];
  return {
    source: o.source === "oem" ? "oem" : "manual",
    keyframes: frames,
    bakeable: o.bakeable !== false,
  };
}

export function interpolateOrientation(track: OrientationTrack, t: number): OrientationKeyframe {
  const list = track.keyframes;
  const zero = { t, rollDeg: 0, pitchDeg: 0, yawDeg: 0 };
  if (list.length === 0) return zero;
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
    rollDeg: lerp(a.rollDeg, b.rollDeg, u),
    pitchDeg: lerp(a.pitchDeg, b.pitchDeg, u),
    yawDeg: lerpYaw(a.yawDeg, b.yawDeg, u),
  };
}

export function upsertOrientation(track: OrientationTrack, next: OrientationKeyframe, epsilon = 0.05): OrientationTrack {
  const parsed = parseOrientationKeyframe(next);
  if (!parsed) return track;
  const kept = track.keyframes.filter((k) => Math.abs(k.t - parsed.t) > epsilon);
  return { ...track, source: "manual", keyframes: [...kept, parsed].sort((a, b) => a.t - b.t) };
}

export function removeOrientationAt(track: OrientationTrack, t: number, epsilon = 0.05): OrientationTrack {
  return { ...track, keyframes: track.keyframes.filter((k) => Math.abs(k.t - t) > epsilon) };
}

/** Photo Sphere Viewer sphereCorrection — pan/tilt/roll in degrees. Not a CSS rotate of the ERP. */
export function sphereCorrectionFromOrientation(frame: OrientationKeyframe): { pan: string; tilt: string; roll: string } {
  return {
    pan: `${frame.yawDeg}deg`,
    tilt: `${frame.pitchDeg}deg`,
    roll: `${frame.rollDeg}deg`,
  };
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
