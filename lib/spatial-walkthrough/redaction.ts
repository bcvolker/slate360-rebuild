import type { RedactionMode, SharePolicy } from "./types";

export type RedactionRule = {
  id?: string;
  clipId: string;
  tStart: number;
  tEnd: number;
  yawMin: number | null;
  yawMax: number | null;
  pitchMin: number | null;
  pitchMax: number | null;
  mode: RedactionMode;
  policy: SharePolicy;
  reason?: string | null;
};

export function isValidRedaction(rule: RedactionRule): boolean {
  if (!(rule.tEnd > rule.tStart)) return false;
  if (rule.tStart < 0) return false;
  return true;
}

export function rulesForPolicy(rules: RedactionRule[], policy: SharePolicy): RedactionRule[] {
  if (policy === "public") return rules.filter((r) => r.policy === "public" || r.policy === "client");
  return rules.filter((r) => r.policy === "client");
}

export function skipIntervals(rules: RedactionRule[], clipId: string): Array<{ start: number; end: number }> {
  return rules
    .filter((r) => r.clipId === clipId && r.mode === "skip")
    .map((r) => ({ start: r.tStart, end: r.tEnd }))
    .sort((a, b) => a.start - b.start);
}

/** If t is inside a skip window, return the end of that window; else t. */
export function applySkip(t: number, intervals: Array<{ start: number; end: number }>): number {
  for (const iv of intervals) {
    if (t >= iv.start && t < iv.end) return iv.end;
  }
  return t;
}

export function sectorCovers(
  rule: RedactionRule,
  yawDeg: number,
  pitchDeg: number,
): boolean {
  if (rule.yawMin == null && rule.yawMax == null && rule.pitchMin == null && rule.pitchMax == null) {
    return true;
  }
  const yawOk =
    rule.yawMin == null || rule.yawMax == null
      ? true
      : yawInRange(yawDeg, rule.yawMin, rule.yawMax);
  const pitchOk =
    rule.pitchMin == null || rule.pitchMax == null
      ? true
      : pitchDeg >= rule.pitchMin && pitchDeg <= rule.pitchMax;
  return yawOk && pitchOk;
}

export function yawInRange(yaw: number, min: number, max: number): boolean {
  const n = wrapDeg(yaw);
  const a = wrapDeg(min);
  const b = wrapDeg(max);
  if (a <= b) return n >= a && n <= b;
  return n >= a || n <= b;
}

function wrapDeg(d: number): number {
  const x = ((d + 180) % 360) + (d + 180 < 0 ? 360 : 0);
  return x - 180;
}

export function activeSectors(
  rules: RedactionRule[],
  clipId: string,
  t: number,
  mode: RedactionMode,
): RedactionRule[] {
  return rules.filter(
    (r) => r.clipId === clipId && r.mode === mode && t >= r.tStart && t < r.tEnd,
  );
}
