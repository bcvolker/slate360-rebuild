import type { ChapterRecord } from "./chapters";
import type { CompareAnchor } from "./compare-anchor";
import { locatorFromView } from "./compare-locator";
import type { CaptureDate } from "./compare-dates";
import type { CompareIssueRef } from "./compare-issue";
import type { WaypointRecord } from "./types";
import { PREVIEW_PATCH, PREVIEW_THEME } from "./preview-fixtures";

export { PREVIEW_PATCH, PREVIEW_THEME };

export const HALL_PROJECT_ID = "proj-hall";

export const HALL_CAPTURES: CaptureDate[] = [
  { walkthroughId: "wt-hall-jun", title: "Corridor L2 — 12 Jun", capturedAt: "2026-06-12T15:00:00.000Z" },
  { walkthroughId: "wt-hall-aug", title: "Corridor L2 — 28 Aug", capturedAt: "2026-08-28T15:00:00.000Z" },
];

function chapter(
  id: string,
  walkthroughId: string,
  clipId: string,
  name: string,
  start: number,
  end: number,
  yaw: number,
  sort: number,
): ChapterRecord {
  return {
    id, walkthroughId, clipId, name, building: "Tower A", floor: "L2", zone: "Corridor",
    chapterType: "corridor", startTime: start, endTime: end, defaultYaw: yaw, defaultPitch: -12,
    sortOrder: sort, thumbnailKey: null, visibility: "client", description: null,
  };
}

function wp(id: string, clipId: string, t: number, label: string, yaw: number, sort: number): WaypointRecord {
  return {
    id, clipId, tSeconds: t, label, zone: "Corridor", yawDeg: yaw, pitchDeg: -16,
    sortOrder: sort, thumbnailKey: null, xyz: null, isVisible: true,
  };
}

export const HALL_JUN_CLIP = { id: "clip-jun", title: "L2 corridor", durationS: 80 };
export const HALL_AUG_CLIP = { id: "clip-aug", title: "L2 corridor", durationS: 84 };

export const HALL_JUN_CHAPTERS: ChapterRecord[] = [
  chapter("ch-jun-entry", "wt-hall-jun", "clip-jun", "Stair entry", 0, 22, 8, 0),
  chapter("ch-jun-hall", "wt-hall-jun", "clip-jun", "Construction hallway", 22, 80, 4, 1),
];

export const HALL_AUG_CHAPTERS: ChapterRecord[] = [
  chapter("ch-aug-entry", "wt-hall-aug", "clip-aug", "Stair entry", 0, 24, 10, 0),
  chapter("ch-aug-hall", "wt-hall-aug", "clip-aug", "Construction hallway", 24, 84, 6, 1),
];

export const HALL_JUN_WAYPOINTS: WaypointRecord[] = [
  wp("wp-jun-door", "clip-jun", 8, "Stair door", 8, 0),
  wp("wp-jun-mid", "clip-jun", 36, "Hall midpoint", 4, 1),
  wp("wp-jun-end", "clip-jun", 62, "North bulkhead", -6, 2),
];

export const HALL_AUG_WAYPOINTS: WaypointRecord[] = [
  wp("wp-aug-door", "clip-aug", 10, "Stair door", 10, 0),
  wp("wp-aug-mid", "clip-aug", 40, "Hall midpoint", 6, 1),
  wp("wp-aug-end", "clip-aug", 68, "North bulkhead", -4, 2),
];

function loc(wt: string, clip: string, chapterId: string, t: number, yaw: number) {
  return locatorFromView({ walkthroughId: wt, clipId: clip, chapterId, tSeconds: t, yawDeg: yaw, pitchDeg: -16 });
}

export const HALL_ANCHORS: CompareAnchor[] = [
  {
    id: "an-door",
    projectId: HALL_PROJECT_ID,
    label: "Stair door",
    beforeWalkthroughId: "wt-hall-jun",
    afterWalkthroughId: "wt-hall-aug",
    before: loc("wt-hall-jun", "clip-jun", "ch-jun-entry", 8, 8),
    after: loc("wt-hall-aug", "clip-aug", "ch-aug-entry", 10, 10),
    createdAt: "2026-08-28T18:00:00.000Z",
  },
  {
    id: "an-mid",
    projectId: HALL_PROJECT_ID,
    label: "Hall midpoint",
    beforeWalkthroughId: "wt-hall-jun",
    afterWalkthroughId: "wt-hall-aug",
    before: loc("wt-hall-jun", "clip-jun", "ch-jun-hall", 36, 4),
    after: loc("wt-hall-aug", "clip-aug", "ch-aug-hall", 40, 6),
    createdAt: "2026-08-28T18:02:00.000Z",
  },
  {
    id: "an-end",
    projectId: HALL_PROJECT_ID,
    label: "North bulkhead",
    beforeWalkthroughId: "wt-hall-jun",
    afterWalkthroughId: "wt-hall-aug",
    before: loc("wt-hall-jun", "clip-jun", "ch-jun-hall", 62, -6),
    after: loc("wt-hall-aug", "clip-aug", "ch-aug-hall", 68, -4),
    createdAt: "2026-08-28T18:04:00.000Z",
  },
];

export const HALL_JUN_PINS = [
  { id: "pin-rail", label: "Missing temporary rail", pinType: "issue" as const, yawDeg: 18, pitchDeg: -8 },
];

export const HALL_AUG_PINS = [
  { id: "pin-rail", label: "Rail still open", pinType: "issue" as const, yawDeg: 16, pitchDeg: -8 },
];

export const HALL_ISSUES: CompareIssueRef[] = [
  {
    id: "iss-rail",
    projectId: HALL_PROJECT_ID,
    pinId: "pin-rail",
    projectItemId: null,
    title: "Missing temporary rail",
    beforeLocator: loc("wt-hall-jun", "clip-jun", "ch-jun-hall", 36, 4),
    afterLocator: loc("wt-hall-aug", "clip-aug", "ch-aug-hall", 40, 6),
    verification: "before",
  },
];
