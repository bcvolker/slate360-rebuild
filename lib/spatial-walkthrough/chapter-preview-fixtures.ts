import type { ChapterRecord } from "./chapters";
import type { ClipEdgeRecord, ClipSummary } from "./clip-edges";
import type { WaypointRecord } from "./types";
import { PREVIEW_PINS, PREVIEW_THEME, PREVIEW_PATCH } from "./preview-fixtures";

export { PREVIEW_THEME, PREVIEW_PATCH, PREVIEW_PINS };

export const PREVIEW_CLIPS: ClipSummary[] = [
  { id: "clip-1", title: "Harbor Yard interior", zone: "Core", durationS: 420, defaultYaw: 8, defaultPitch: -6, sortOrder: 0, videoUrl: "", posterUrl: null },
  { id: "clip-2", title: "Exterior North", zone: "North", durationS: 90, defaultYaw: 40, defaultPitch: -10, sortOrder: 1, videoUrl: "", posterUrl: null },
  { id: "clip-3", title: "Roof aerial", zone: "Roof", durationS: 48, defaultYaw: 0, defaultPitch: -28, sortOrder: 2, videoUrl: "", posterUrl: null },
];

export const PREVIEW_CHAPTERS: ChapterRecord[] = [
  { id: "ch-lobby", walkthroughId: "wt-hy", clipId: "clip-1", name: "Lobby", building: "Tower A", floor: "L1", zone: "Lobby", chapterType: "lobby", startTime: 0, endTime: 45, defaultYaw: 12, defaultPitch: -8, sortOrder: 0, thumbnailKey: null, visibility: "client", description: "Main reception" },
  { id: "ch-l1", walkthroughId: "wt-hy", clipId: "clip-1", name: "Level 1", building: "Tower A", floor: "L1", zone: "Core", chapterType: "floor", startTime: 45, endTime: 140, defaultYaw: 18, defaultPitch: -10, sortOrder: 1, thumbnailKey: null, visibility: "client", description: null },
  { id: "ch-mech", walkthroughId: "wt-hy", clipId: "clip-1", name: "Mechanical Room", building: "Tower A", floor: "L1", zone: "MEP", chapterType: "mechanical", startTime: 140, endTime: 210, defaultYaw: -20, defaultPitch: -12, sortOrder: 2, thumbnailKey: null, visibility: "client", description: "AHU-3" },
  { id: "ch-stair", walkthroughId: "wt-hy", clipId: "clip-1", name: "Stair 1", building: "Tower A", floor: "L1–L2", zone: "Stair", chapterType: "stairs", startTime: 210, endTime: 250, defaultYaw: 90, defaultPitch: -4, sortOrder: 3, thumbnailKey: null, visibility: "client", description: null },
  { id: "ch-l2", walkthroughId: "wt-hy", clipId: "clip-1", name: "Level 2", building: "Tower A", floor: "L2", zone: "Core", chapterType: "floor", startTime: 250, endTime: 380, defaultYaw: 6, defaultPitch: -8, sortOrder: 4, thumbnailKey: null, visibility: "client", description: null },
  { id: "ch-north", walkthroughId: "wt-hy", clipId: "clip-2", name: "Exterior North", building: "Tower A", floor: null, zone: "North", chapterType: "exterior", startTime: 0, endTime: 90, defaultYaw: 40, defaultPitch: -10, sortOrder: 5, thumbnailKey: null, visibility: "client", description: null },
  { id: "ch-aerial", walkthroughId: "wt-hy", clipId: "clip-3", name: "Aerial", building: "Tower A", floor: "Roof", zone: "Roof", chapterType: "aerial", startTime: 0, endTime: 48, defaultYaw: 0, defaultPitch: -25, sortOrder: 6, thumbnailKey: null, visibility: "public", description: null },
];

export const PREVIEW_EDGES: ClipEdgeRecord[] = [
  { id: "e1", walkthroughId: "wt-hy", sourceClipId: "clip-1", destClipId: "clip-2", sourceEndpoint: "end", destEndpoint: "start", defaultYaw: 40, defaultPitch: -10, transitionType: "exterior" },
  { id: "e-aerial", walkthroughId: "wt-hy", sourceClipId: "clip-2", destClipId: "clip-3", sourceEndpoint: "end", destEndpoint: "start", defaultYaw: 0, defaultPitch: -28, transitionType: "aerial" },
];

export const PREVIEW_CHAPTER_WAYPOINTS: WaypointRecord[] = [
  { id: "wp-lobby", clipId: "clip-1", tSeconds: 12, label: "Reception", zone: "Lobby", yawDeg: 12, pitchDeg: -18, sortOrder: 0, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "wp-l1", clipId: "clip-1", tSeconds: 70, label: "L1 corridor", zone: "L1", yawDeg: 28, pitchDeg: -22, sortOrder: 1, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "wp-core", clipId: "clip-1", tSeconds: 110, label: "Core", zone: "L1", yawDeg: 8, pitchDeg: -26, sortOrder: 2, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "wp-mech", clipId: "clip-1", tSeconds: 168, label: "AHU-3", zone: "MEP", yawDeg: -20, pitchDeg: -30, sortOrder: 3, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "wp-north", clipId: "clip-2", tSeconds: 8, label: "North door", zone: "North", yawDeg: 40, pitchDeg: -16, sortOrder: 0, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "wp-yard", clipId: "clip-2", tSeconds: 42, label: "Yard", zone: "North", yawDeg: 18, pitchDeg: -20, sortOrder: 1, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "wp-aerial", clipId: "clip-3", tSeconds: 6, label: "Roof", zone: "Roof", yawDeg: 4, pitchDeg: -32, sortOrder: 0, thumbnailKey: null, xyz: null, isVisible: true },
];
