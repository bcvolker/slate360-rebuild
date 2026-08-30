import type { BrandTheme, OperatorPatch, PinType, WaypointRecord } from "./types";
import { DEFAULT_OPERATOR_PATCH } from "./types";
import type { LibraryCard } from "./library-filter";

export const PREVIEW_THEME: BrandTheme = {
  logoUrl: null,
  primaryColor: "#12171f",
  secondaryColor: "#2a3340",
  accentColor: "#3aa0c8",
  pageBgColor: "#0b0f15",
  surfaceColor: "#151b24",
  textColor: "#f8fafc",
  mutedTextColor: "#a3aed0",
  logoTreatment: "auto",
  showPoweredBy: true,
};

export const PREVIEW_PATCH: OperatorPatch = {
  ...DEFAULT_OPERATOR_PATCH,
  enabled: true,
  fill: "brand",
  logoInPatch: true,
  showDate: true,
  showCompass: true,
  headingDeg: 18,
};

export const PREVIEW_WAYPOINTS: WaypointRecord[] = [
  { id: "wp1", clipId: "clip-1", tSeconds: 4, label: "Lobby", zone: "Core", yawDeg: 12, pitchDeg: -28, sortOrder: 0, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "wp2", clipId: "clip-1", tSeconds: 18, label: "Corridor", zone: "L2", yawDeg: 40, pitchDeg: -22, sortOrder: 1, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "wp3", clipId: "clip-1", tSeconds: 36, label: "MEP", zone: "Mech", yawDeg: -20, pitchDeg: -32, sortOrder: 2, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "wp4", clipId: "clip-1", tSeconds: 54, label: "West face", zone: "Mech", yawDeg: -48, pitchDeg: -24, sortOrder: 3, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "wp5", clipId: "clip-1", tSeconds: 72, label: "Stair", zone: "Core", yawDeg: 62, pitchDeg: -18, sortOrder: 4, thumbnailKey: null, xyz: null, isVisible: true },
];

export type PreviewPin = {
  id: string;
  label: string;
  pinType: PinType;
  body: string | null;
  yawDeg: number;
  pitchDeg: number;
  tSeconds: number | null;
  attachments: Array<{
    id: string;
    kind: "slatedrop" | "url";
    title: string | null;
    fileName?: string | null;
    previewUrl?: string | null;
  }>;
};

export const PREVIEW_PINS: PreviewPin[] = [
  {
    id: "pin-doc",
    label: "AHU-3 submittal",
    pinType: "document",
    body: "Approved mechanical submittal for the level-2 air handler.",
    yawDeg: -14,
    pitchDeg: -8,
    tSeconds: 18,
    attachments: [{ id: "a1", kind: "slatedrop", title: "AHU-3.pdf", fileName: "AHU-3.pdf", previewUrl: "/preview/spatial-walkthrough?scene=pdf" }],
  },
  {
    id: "pin-issue",
    label: "Clearance hold",
    pinType: "issue",
    body: "Keep 36in service clearance at the west face.",
    yawDeg: 28,
    pitchDeg: -12,
    tSeconds: 20,
    attachments: [],
  },
  {
    id: "pin-note",
    label: "Field note",
    pinType: "note",
    body: "Photo-documented existing hanger layout.",
    yawDeg: 8,
    pitchDeg: -6,
    tSeconds: 22,
    attachments: [],
  },
];

export const PREVIEW_LIBRARY: LibraryCard[] = [
  {
    id: "wt-1",
    title: "Level 12 — Mechanical penthouse",
    captured_at: "2026-08-12T15:00:00.000Z",
    building: "Tower A",
    floor: "L12",
    zone: "MEP",
    walkthrough_type: "interior",
    status: "published",
    duration_s: 248,
    waypointCount: 11,
    pinCount: 7,
    shareStatus: "live",
  },
  {
    id: "wt-2",
    title: "Podium — Loading dock",
    captured_at: "2026-08-09T11:20:00.000Z",
    building: "Podium",
    floor: "L1",
    zone: "Dock",
    walkthrough_type: "exterior",
    status: "ready",
    duration_s: 131,
    waypointCount: 6,
    pinCount: 2,
    shareStatus: "unshared",
  },
  {
    id: "wt-3",
    title: "Roof — Cooling towers",
    captured_at: "2026-07-28T09:05:00.000Z",
    building: "Tower A",
    floor: "Roof",
    zone: "CT",
    walkthrough_type: "aerial",
    status: "published",
    duration_s: 92,
    waypointCount: 4,
    pinCount: 3,
    shareStatus: "expired",
  },
];
