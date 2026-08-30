import type { AccessPolicy, RedactionMode, SharePolicy } from "./types";

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
  waypointId?: string | null;
};

export const AUTHORING_MODES: RedactionMode[] = ["skip", "cover", "hide-waypoint", "panel"];

export function isValidRedaction(rule: RedactionRule): boolean {
  if (!(rule.tEnd > rule.tStart)) return false;
  if (rule.tStart < 0) return false;
  if (rule.mode === "hide-waypoint" && !rule.waypointId) return false;
  if ((rule.mode === "cover" || rule.mode === "panel" || rule.mode === "solid") &&
      (rule.yawMin == null || rule.yawMax == null)) {
    return false;
  }
  return true;
}

/** MASTER is the unmodified record: no skip/cover/hide applies. */
export function rulesForPolicy(rules: RedactionRule[], policy: AccessPolicy): RedactionRule[] {
  if (policy === "master") return [];
  if (policy === "public") return rules.filter((r) => r.policy === "public" || r.policy === "client");
  return rules.filter((r) => r.policy === "client");
}

export function skipIntervals(rules: RedactionRule[], clipId: string): Array<{ start: number; end: number }> {
  return mergeIntervals(
    rules
      .filter((r) => r.clipId === clipId && r.mode === "skip")
      .map((r) => ({ start: r.tStart, end: r.tEnd }))
      .sort((a, b) => a.start - b.start),
  );
}

export function mergeIntervals(intervals: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
  const out: Array<{ start: number; end: number }> = [];
  for (const iv of intervals) {
    const last = out[out.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else out.push({ ...iv });
  }
  return out;
}

/** If t is inside a skip window, return the end of that window; else t. */
export function applySkip(t: number, intervals: Array<{ start: number; end: number }>): number {
  for (const iv of intervals) {
    if (t >= iv.start && t < iv.end) return iv.end;
  }
  return t;
}

export function wrapYaw(deg: number): number {
  const x = ((deg + 180) % 360 + 360) % 360;
  return x - 180;
}

/** Inclusive yaw range. When min>max after wrap, the sector crosses the ±180 seam. */
export function yawInRange(yaw: number, min: number, max: number): boolean {
  const n = wrapYaw(yaw);
  const a = wrapYaw(min);
  const b = wrapYaw(max);
  if (a <= b) return n >= a && n <= b;
  return n >= a || n <= b;
}

/** Mid-yaw of a sector. Crossing ±180 must not place the marker at 0°. */
export function sectorYawCenter(yawMin: number, yawMax: number): number {
  const a = wrapYaw(yawMin);
  const b = wrapYaw(yawMax);
  if (a <= b) return wrapYaw((a + b) / 2);
  const span = 180 - a + (b + 180);
  return wrapYaw(a + span / 2);
}

export function sectorCovers(rule: RedactionRule, yawDeg: number, pitchDeg: number): boolean {
  if (rule.yawMin == null && rule.yawMax == null && rule.pitchMin == null && rule.pitchMax == null) {
    return true;
  }
  const yawOk =
    rule.yawMin == null || rule.yawMax == null ? true : yawInRange(yawDeg, rule.yawMin, rule.yawMax);
  const pitchOk =
    rule.pitchMin == null || rule.pitchMax == null
      ? true
      : pitchDeg >= Math.min(rule.pitchMin, rule.pitchMax) && pitchDeg <= Math.max(rule.pitchMin, rule.pitchMax);
  return yawOk && pitchOk;
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

export function hiddenWaypointIds(rules: RedactionRule[], clipId: string): Set<string> {
  const ids = new Set<string>();
  for (const r of rules) {
    if (r.clipId === clipId && r.mode === "hide-waypoint" && r.waypointId) ids.add(r.waypointId);
  }
  return ids;
}

export function timelineMarks(
  rules: RedactionRule[],
  clipId: string,
  duration: number,
): Array<{ start: number; end: number; mode: RedactionMode }> {
  return rules
    .filter((r) => r.clipId === clipId && r.mode !== "hide-waypoint")
    .map((r) => ({
      start: r.tStart,
      end: Math.min(r.tEnd, duration || r.tEnd),
      mode: r.mode,
    }));
}

export function redactionForRecipient(rule: RedactionRule, policy: AccessPolicy): RedactionRule {
  if (policy === "public") return { ...rule, reason: null };
  return rule;
}
