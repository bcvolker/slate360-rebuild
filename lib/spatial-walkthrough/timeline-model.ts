import type { AccessPolicy, SharePolicy } from "./types";
import type { ChapterRecord } from "./chapters";
import type { WaypointRecord } from "./types";
import type { RedactionRule } from "./redaction";
import { applySkip, skipIntervals } from "./redaction";
import type { OperatorKeyframe } from "./keyframes";

export const TIMELINE_TRACKS = [
  "video",
  "chapters",
  "privacy",
  "skip",
  "waypoints",
  "pins",
  "narration",
] as const;

export type TimelineTrackId = (typeof TIMELINE_TRACKS)[number];

export type TimelineRange = {
  id: string;
  track: TimelineTrackId;
  start: number;
  end: number;
  policy?: SharePolicy | AccessPolicy;
  label: string;
  mode?: string;
};

export type PinMark = { id: string; t: number; label: string };

export function deliveredTime(masterT: number, skips: Array<{ start: number; end: number }>): number {
  let t = masterT;
  let subtracted = 0;
  for (const iv of skips) {
    if (masterT >= iv.end) subtracted += iv.end - iv.start;
    else if (masterT > iv.start) return iv.start - subtracted;
  }
  return t - subtracted;
}

export function masterTimeFromDelivered(delivered: number, skips: Array<{ start: number; end: number }>): number {
  let t = delivered;
  for (const iv of skips) {
    if (t >= iv.start) t += iv.end - iv.start;
  }
  return t;
}

export function playbackHead(masterT: number, rules: RedactionRule[], clipId: string): number {
  return applySkip(masterT, skipIntervals(rules, clipId));
}

export function snapTime(
  t: number,
  bounds: number[],
  threshold = 0.35,
): number {
  let best = t;
  let dist = threshold;
  for (const b of bounds) {
    const d = Math.abs(b - t);
    if (d < dist) {
      dist = d;
      best = b;
    }
  }
  return best;
}

export function snapBounds(args: {
  duration: number;
  waypoints: WaypointRecord[];
  chapters: ChapterRecord[];
  redactions: RedactionRule[];
  keyframes?: OperatorKeyframe[];
}): number[] {
  const out = [0, args.duration];
  for (const w of args.waypoints) out.push(w.tSeconds);
  for (const c of args.chapters) {
    out.push(c.startTime, c.endTime);
  }
  for (const r of args.redactions) {
    out.push(r.tStart, r.tEnd);
  }
  for (const k of args.keyframes ?? []) out.push(k.t);
  return [...new Set(out.map((n) => Math.round(n * 100) / 100))].sort((a, b) => a - b);
}

export function chapterRanges(chapters: ChapterRecord[]): TimelineRange[] {
  return chapters.map((c) => ({
    id: c.id,
    track: "chapters",
    start: c.startTime,
    end: c.endTime,
    label: c.name,
    policy: c.visibility === "internal" ? "master" : c.visibility,
  }));
}

export function skipRanges(rules: RedactionRule[]): TimelineRange[] {
  return rules
    .filter((r) => r.mode === "skip")
    .map((r) => ({
      id: r.id ?? `skip-${r.tStart}`,
      track: "skip",
      start: r.tStart,
      end: r.tEnd,
      label: r.reason || "Excluded",
      policy: r.policy,
      mode: "skip",
    }));
}

export function privacyRanges(rules: RedactionRule[]): TimelineRange[] {
  return rules
    .filter((r) => r.mode !== "skip" && r.mode !== "hide-waypoint")
    .map((r) => ({
      id: r.id ?? `priv-${r.tStart}-${r.mode}`,
      track: "privacy",
      start: r.tStart,
      end: r.tEnd,
      label: r.mode,
      policy: r.policy,
      mode: r.mode,
    }));
}

export function resizeRange(range: TimelineRange, edge: "start" | "end", t: number, minSpan = 0.2): TimelineRange {
  if (edge === "start") {
    return { ...range, start: Math.min(t, range.end - minSpan) };
  }
  return { ...range, end: Math.max(t, range.start + minSpan) };
}

export function excludeDraft(inT: number | null, outT: number | null): { start: number; end: number } | null {
  if (inT == null || outT == null) return null;
  const start = Math.min(inT, outT);
  const end = Math.max(inT, outT);
  if (end - start < 0.2) return null;
  return { start, end };
}
