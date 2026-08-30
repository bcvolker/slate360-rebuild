import type { SharePolicy, WaypointRecord } from "./types";

export const ENTIRE_WALK_NAME = "Entire Walk";

export const CHAPTER_TYPES = [
  "floor",
  "room",
  "zone",
  "lobby",
  "mechanical",
  "stairs",
  "corridor",
  "exterior",
  "aerial",
  "other",
] as const;

export type ChapterType = (typeof CHAPTER_TYPES)[number];
export type ChapterVisibility = "internal" | "client" | "public";

export type ChapterRecord = {
  id: string;
  walkthroughId: string;
  clipId: string;
  name: string;
  building: string | null;
  floor: string | null;
  zone: string | null;
  chapterType: ChapterType;
  startTime: number;
  endTime: number;
  defaultYaw: number;
  defaultPitch: number;
  sortOrder: number;
  thumbnailKey: string | null;
  visibility: ChapterVisibility;
  description: string | null;
};

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function toChapter(row: Record<string, unknown>): ChapterRecord {
  const type = String(row.chapter_type ?? row.chapterType ?? "other");
  const vis = String(row.visibility ?? "client");
  return {
    id: String(row.id),
    walkthroughId: String(row.walkthrough_id ?? row.walkthroughId),
    clipId: String(row.clip_id ?? row.clipId),
    name: String(row.name ?? "Space"),
    building: str(row.building),
    floor: str(row.floor),
    zone: str(row.zone),
    chapterType: CHAPTER_TYPES.includes(type as ChapterType) ? (type as ChapterType) : "other",
    startTime: num(row.start_time ?? row.startTime),
    endTime: num(row.end_time ?? row.endTime),
    defaultYaw: num(row.default_yaw ?? row.defaultYaw),
    defaultPitch: num(row.default_pitch ?? row.defaultPitch),
    sortOrder: num(row.sort_order ?? row.sortOrder),
    thumbnailKey: str(row.thumbnail_key ?? row.thumbnailKey),
    visibility: vis === "internal" || vis === "public" ? vis : "client",
    description: str(row.description),
  };
}

export function orderedChapters(chapters: ChapterRecord[]): ChapterRecord[] {
  return chapters.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.startTime - b.startTime);
}

export function chapterVisibleOnPolicy(visibility: ChapterVisibility, policy: SharePolicy): boolean {
  if (policy === "public") return visibility === "public";
  return visibility === "public" || visibility === "client";
}

export function visibleChapters(
  chapters: ChapterRecord[],
  policy: SharePolicy | "master" = "client",
): ChapterRecord[] {
  const list = orderedChapters(chapters);
  if (policy === "master") return list;
  return list.filter((c) => chapterVisibleOnPolicy(c.visibility, policy));
}

export function timeInChapter(chapter: ChapterRecord, clipId: string, t: number): boolean {
  return chapter.clipId === clipId && t >= chapter.startTime - 0.05 && t <= chapter.endTime + 0.05;
}

export function chapterAtTime(
  chapters: ChapterRecord[],
  clipId: string,
  t: number,
): ChapterRecord | null {
  const hits = orderedChapters(chapters).filter((c) => timeInChapter(c, clipId, t));
  return hits[0] ?? null;
}

export function waypointsInChapter(waypoints: WaypointRecord[], chapter: ChapterRecord): WaypointRecord[] {
  return waypoints
    .filter((w) => w.isVisible && w.clipId === chapter.clipId && w.tSeconds >= chapter.startTime - 0.05 && w.tSeconds <= chapter.endTime + 0.05)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.tSeconds - b.tSeconds);
}

export function pinsInChapter<T extends { clipId?: string | null; tSeconds: number | null }>(
  pins: T[],
  chapter: ChapterRecord,
): T[] {
  return pins.filter((p) => {
    if (p.clipId && p.clipId !== chapter.clipId) return false;
    if (p.tSeconds == null) return p.clipId === chapter.clipId;
    return p.tSeconds >= chapter.startTime - 0.05 && p.tSeconds <= chapter.endTime + 0.05;
  });
}

export type TimelineBand = {
  id: string;
  name: string;
  startPct: number;
  widthPct: number;
  active: boolean;
};

export function chapterBands(
  chapters: ChapterRecord[],
  clipId: string,
  duration: number,
  activeId: string | null,
): TimelineBand[] {
  if (!(duration > 0)) return [];
  return orderedChapters(chapters)
    .filter((c) => c.clipId === clipId)
    .map((c) => {
      const start = Math.max(0, Math.min(100, (c.startTime / duration) * 100));
      const end = Math.max(0, Math.min(100, (c.endTime / duration) * 100));
      return {
        id: c.id,
        name: c.name,
        startPct: start,
        widthPct: Math.max(1.5, end - start),
        active: activeId === c.id,
      };
    });
}

export function assignChapterSort(chapters: ChapterRecord[]): ChapterRecord[] {
  return orderedChapters(chapters).map((c, i) => ({ ...c, sortOrder: i }));
}

export function normalizeTimeRange(start: number, end: number): { startTime: number; endTime: number } | null {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const startTime = Math.min(start, end);
  const endTime = Math.max(start, end);
  if (endTime - startTime < 0.2) return null;
  return { startTime, endTime };
}

/** Deleting a chapter never removes source media. */
export function chapterDeleteTouchesSource(): false {
  return false;
}

export function displayChapterName(
  selected: ChapterRecord | null,
  current: ChapterRecord | null,
  entireWalk: boolean,
): string {
  if (!entireWalk && selected) return selected.name;
  return current?.name ?? ENTIRE_WALK_NAME;
}

export function clampToChapter(t: number, chapter: ChapterRecord): number {
  return Math.min(chapter.endTime, Math.max(chapter.startTime, t));
}

export function orderedWaypointsAll(waypoints: WaypointRecord[], clipOrder: string[]): WaypointRecord[] {
  const rank = new Map(clipOrder.map((id, i) => [id, i]));
  return waypoints
    .filter((w) => w.isVisible)
    .slice()
    .sort((a, b) => {
      const ca = rank.get(a.clipId) ?? 999;
      const cb = rank.get(b.clipId) ?? 999;
      return ca - cb || a.sortOrder - b.sortOrder || a.tSeconds - b.tSeconds;
    });
}

export function indexAtPosition(
  waypoints: WaypointRecord[],
  clipOrder: string[],
  clipId: string,
  t: number,
): number {
  const list = orderedWaypointsAll(waypoints, clipOrder);
  if (list.length === 0) return -1;
  const rank = new Map(clipOrder.map((id, i) => [id, i]));
  const here = rank.get(clipId) ?? 0;
  let best = 0;
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    const wr = rank.get(w.clipId) ?? 0;
    if (wr < here || (w.clipId === clipId && w.tSeconds <= t + 0.05)) best = i;
  }
  return best;
}

export function nextInList(list: WaypointRecord[], fromIndex: number): WaypointRecord | null {
  if (fromIndex < 0) return list[0] ?? null;
  return list[fromIndex + 1] ?? null;
}

export function prevInList(list: WaypointRecord[], fromIndex: number): WaypointRecord | null {
  if (fromIndex <= 0) return null;
  return list[fromIndex - 1] ?? null;
}
