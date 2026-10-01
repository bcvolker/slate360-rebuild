import type { ChapterRecord } from "./chapters";
import type { ClipEdgeRecord, ClipSummary } from "./clip-edges";
import type { WaypointRecord } from "./types";
import { PREVIEW_PINS, PREVIEW_THEME, PREVIEW_PATCH } from "./preview-fixtures";

export { PREVIEW_THEME, PREVIEW_PATCH, PREVIEW_PINS };

export const PREVIEW_CLIPS: ClipSummary[] = [
  { id: "clip-1", title: "Harbor Yard interior", zone: "Core", durationS: 420, defaultYaw: 8, defaultPitch: -6, sortOrder: 0, videoUrl: "", posterUrl: null },
  { id: "clip-2", title: "Exterior North", zone: "North", durationS: 90, defaultYaw: 40, defaultPitch: -10, sortOrder: 1, videoUrl: "", posterUrl: null },
];

export const PREVIEW_CHAPTERS: ChapterRecord[] = [
  { id: "ch-lobby", walkthroughId: "wt-hy", clipId: "clip-1", name: "Lobby", building: "Tower A", floor: "L1", zone: "Lobby", chapterType: "lobby", startTime: 0, endTime: 45, defaultYaw: 12, defaultPitch: -8, sortOrder: 0, thumbnailKey: null, visibility: "client", description: "Main reception" },
  { id: "ch-l1", walkthroughId: "wt-hy", clipId: "clip-1", name: "Level 1", building: "Tower A", floor: "L1", zone: "Core", chapterType: "floor", startTime: 45, endTime: 140, defaultYaw: 18, defaultPitch: -10, sortOrder: 1, thumbnailKey: null, visibility: "client", description: null },
  { id: "ch-mech", walkthroughId: "wt-hy", clipId: "clip-1", name: "Mechanical Room", building: "Tower A", floor: "L1", zone: "MEP", chapterType: "mechanical", startTime: 140, endTime: 210, defaultYaw: -20, defaultPitch: -12, sortOrder: 2, thumbnailKey: null, visibility: "client", description: "AHU-3" },
  { id: "ch-stair", walkthroughId: "wt-hy", clipId: "clip-1", name: "Stair 1", building: "Tower A", floor: "L1–L2", zone: "Stair", chapterType: "stairs", startTime: 210, endTime: 250, defaultYaw: 90, defaultPitch: -4, sortOrder: 3, thumbnailKey: null, visibility: "client", description: null },
  { id: "ch-l2", walkthroughId: "wt-hy", clipId: "clip-1", name: "Level 2", building: "Tower A", floor: "L2", zone: "Core", chapterType: "floor", startTime: 250, endTime: 380, defaultYaw: 6, defaultPitch: -8, sortOrder: 4, thumbnailKey: null, visibility: "client", description: null },
  { id: "ch-north", walkthroughId: "wt-hy", clipId: "clip-2", name: "Exterior North", building: "Tower A", floor: null, zone: "North", chapterType: "exterior", startTime: 0, endTime: 40, defaultYaw: 40, defaultPitch: -10, sortOrder: 5, thumbnailKey: null, visibility: "client", description: null },
  { id: "ch-aerial", walkthroughId: "wt-hy", clipId: "clip-2", name: "Aerial", building: "Tower A", floor: "Roof", zone: "Roof", chapterType: "aerial", startTime: 40, endTime: 90, defaultYaw: 0, defaultPitch: -25, sortOrder: 6, thumbnailKey: null, visibility: "public", description: null },
];

export const PREVIEW_EDGES: ClipEdgeRecord[] = [
  { id: "e1", walkthroughId: "wt-hy", sourceClipId: "clip-1", destClipId: "clip-2", sourceEndpoint: "end", destEndpoint: "start", defaultYaw: 40, defaultPitch: -10, transitionType: "exterior" },
];

export const PREVIEW_CHAPTER_WAYPOINTS: WaypointRecord[] = [
  { id: "wp-lobby", clipId: "clip-1", tSeconds: 12, label: "Reception", zone: "Lobby", yawDeg: 12, pitchDeg: -8, sortOrder: 0, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "wp-l1", clipId: "clip-1", tSeconds: 70, label: "L1 corridor", zone: "L1", yawDeg: 28, pitchDeg: -10, sortOrder: 1, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "wp-mech", clipId: "clip-1", tSeconds: 168, label: "AHU-3", zone: "MEP", yawDeg: -20, pitchDeg: -14, sortOrder: 2, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "wp-north", clipId: "clip-2", tSeconds: 8, label: "North door", zone: "North", yawDeg: 40, pitchDeg: -8, sortOrder: 0, thumbnailKey: null, xyz: null, isVisible: true },
];
