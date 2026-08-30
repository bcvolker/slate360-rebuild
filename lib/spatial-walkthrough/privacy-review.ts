import type { OperatorKeyframe } from "./keyframes";
import { interpolateKeyframes, nextKeyframe, prevKeyframe } from "./keyframes";
import type { RedactionRule } from "./redaction";

export const REVIEW_RATES = [1, 2, 4] as const;
export type ReviewRate = (typeof REVIEW_RATES)[number];

export type ContactStripSample = {
  t: number;
  yawCenter: number;
  yawWidth: number;
  pitchTop: number;
  pitchBottom: number;
};

/** Regular samples of the rear/operator sector so brief exposure is visible on a strip. */
export function contactStripSamples(
  frames: OperatorKeyframe[],
  duration: number,
  interval = 2,
): ContactStripSample[] {
  if (!(duration > 0) || interval <= 0) return [];
  const out: ContactStripSample[] = [];
  for (let t = 0; t <= duration + 0.001; t += interval) {
    const k = interpolateKeyframes(frames, Math.min(t, duration));
    if (!k) continue;
    out.push({
      t: Math.min(t, duration),
      yawCenter: k.yawCenter,
      yawWidth: k.yawWidth,
      pitchTop: k.pitchTop,
      pitchBottom: k.pitchBottom,
    });
  }
  return out;
}

export function privacyBoundaries(rules: RedactionRule[], frames: OperatorKeyframe[]): number[] {
  const t = new Set<number>();
  for (const r of rules) {
    t.add(r.tStart);
    t.add(r.tEnd);
  }
  for (const k of frames) t.add(k.t);
  return [...t].sort((a, b) => a - b);
}

export function jumpPrivacy(kind: "prev" | "next", t: number, frames: OperatorKeyframe[], rules: RedactionRule[]): number | null {
  const marks = privacyBoundaries(rules, frames);
  if (kind === "prev") {
    const hit = [...marks].reverse().find((m) => m < t - 0.04);
    const kf = prevKeyframe(frames, t);
    if (hit == null) return kf?.t ?? null;
    if (kf && kf.t > hit) return kf.t;
    return hit;
  }
  const hit = marks.find((m) => m > t + 0.04);
  const kf = nextKeyframe(frames, t);
  if (hit == null) return kf?.t ?? null;
  if (kf && kf.t < hit) return kf.t;
  return hit;
}

export function nextReviewRate(current: ReviewRate): ReviewRate {
  const i = REVIEW_RATES.indexOf(current);
  return REVIEW_RATES[(i + 1) % REVIEW_RATES.length];
}
