import type { ChapterRecord } from "./chapters";
import type { CompareLocator } from "./compare-locator";
import { orientationDelta } from "./compare-locator";
import type { WaypointRecord } from "./types";

export type MatchCandidate = {
  locator: CompareLocator;
  score: number;
  reason: "chapter" | "waypoint" | "both";
  label: string;
};

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function chapterAt(chapters: ChapterRecord[], clipId: string, t: number): ChapterRecord | null {
  return chapters.find((c) => c.clipId === clipId && t >= c.startTime - 0.05 && t <= c.endTime + 0.05) ?? null;
}

function timeScore(sourceT: number, sourceSpan: number, destT: number, destSpan: number): number {
  if (!(sourceSpan > 0) || !(destSpan > 0)) return 0.4;
  const a = sourceT / sourceSpan;
  const b = destT / destSpan;
  return Math.max(0, 1 - Math.abs(a - b));
}

/**
 * Chapter-name and waypoint-label assistance. Not geometric registration.
 */
export function matchCandidates(args: {
  source: CompareLocator;
  sourceChapters: ChapterRecord[];
  sourceWaypoints: WaypointRecord[];
  destWalkthroughId: string;
  destClips: Array<{ id: string; durationS: number }>;
  destChapters: ChapterRecord[];
  destWaypoints: WaypointRecord[];
  limit?: number;
}): MatchCandidate[] {
  const { source, destWalkthroughId, destChapters, destWaypoints, destClips, limit = 5 } = args;
  const srcChapter = chapterAt(args.sourceChapters, source.clipId, source.tSeconds);
  const srcWp = args.sourceWaypoints
    .filter((w) => w.clipId === source.clipId && w.isVisible)
    .slice()
    .sort((a, b) => Math.abs(a.tSeconds - source.tSeconds) - Math.abs(b.tSeconds - source.tSeconds))[0];
  const out: MatchCandidate[] = [];

  for (const chapter of destChapters) {
    const nameHit = srcChapter && norm(chapter.name) === norm(srcChapter.name);
    const typeHit = srcChapter && chapter.chapterType === srcChapter.chapterType && chapter.chapterType !== "other";
    if (!nameHit && !typeHit) continue;
    const clip = destClips.find((c) => c.id === chapter.clipId);
    const mid = (chapter.startTime + chapter.endTime) / 2;
    const locator: CompareLocator = {
      walkthroughId: destWalkthroughId,
      clipId: chapter.clipId,
      chapterId: chapter.id,
      tSeconds: mid,
      yawDeg: chapter.defaultYaw,
      pitchDeg: chapter.defaultPitch,
      xyz: null,
    };
    const orient = orientationDelta(source, locator);
    const tScore = timeScore(
      source.tSeconds - (srcChapter?.startTime ?? 0),
      (srcChapter?.endTime ?? 1) - (srcChapter?.startTime ?? 0),
      mid - chapter.startTime,
      chapter.endTime - chapter.startTime,
    );
    const score = (nameHit ? 0.55 : 0.28) + tScore * 0.25 + Math.max(0, 0.2 - orient.yaw / 180);
    out.push({ locator, score, reason: "chapter", label: chapter.name });
    void clip;
  }

  for (const wp of destWaypoints.filter((w) => w.isVisible && w.label)) {
    if (!srcWp?.label || norm(wp.label) !== norm(srcWp.label)) continue;
    const chapter = chapterAt(destChapters, wp.clipId, wp.tSeconds);
    const locator: CompareLocator = {
      walkthroughId: destWalkthroughId,
      clipId: wp.clipId,
      chapterId: chapter?.id ?? null,
      tSeconds: wp.tSeconds,
      yawDeg: wp.yawDeg,
      pitchDeg: wp.pitchDeg,
      xyz: null,
    };
    const orient = orientationDelta(source, locator);
    const score = 0.7 + Math.max(0, 0.25 - orient.yaw / 240);
    out.push({ locator, score, reason: srcChapter && chapter && norm(srcChapter.name) === norm(chapter.name) ? "both" : "waypoint", label: wp.label ?? "Station" });
  }

  return out
    .sort((a, b) => b.score - a.score)
    .filter((c, i, list) => list.findIndex((x) => x.locator.clipId === c.locator.clipId && Math.abs(x.locator.tSeconds - c.locator.tSeconds) < 0.4) === i)
    .slice(0, limit);
}
