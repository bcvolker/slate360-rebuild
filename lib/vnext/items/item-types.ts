/** Client-facing item record. Raw site_walk_* rows never reach the UI. */

export type VnextItemStatusTone = "attention" | "done" | "neutral";

export type VnextPlanLocator = {
  kind: "plan";
  sheetId: string;
  xPct: number;
  yPct: number;
  precise: true;
};

/**
 * Opens a captured panorama. `precise: false` means no yaw/pitch anchor exists —
 * this is "open this panorama", not "look exactly at the item".
 */
export type VnextPanoramaLocator = {
  kind: "panorama";
  sourceId: string;
  precise: false;
};

/** Ready for a proven item→model XYZ link. Nothing in the schema produces this today. */
export type VnextSpatial3DLocator = {
  kind: "spatial3d";
  representation: "reality" | "geometry";
  sourceId: string;
  x: number;
  y: number;
  z: number;
  precise: true;
};

export type VnextGeoLocator = {
  kind: "geo";
  latitude: number;
  longitude: number;
  locationLabel: string | null;
};

/** Documented during a visit. Not an exact spatial position. */
export type VnextVisitLocator = {
  kind: "visit";
  sessionId: string;
  capturedAt: string;
};

export type VnextItemLocator =
  | VnextPlanLocator
  | VnextPanoramaLocator
  | VnextSpatial3DLocator
  | VnextGeoLocator
  | VnextVisitLocator;

export type VnextSpatialAction = {
  representation: "plan" | "360";
  sourceId: string;
  precise: boolean;
};

export type VnextClientItem = {
  id: string;
  title: string;
  description: string | null;
  typeLabel: string;
  status: string;
  statusLabel: string;
  statusTone: VnextItemStatusTone;
  /** High or critical only. Omitted when it would just repeat a default. */
  priorityLabel: string | null;
  trade: string | null;
  category: string | null;
  /** Search only — not rendered as chips. */
  tags: string[];
  documentedAt: string;
  dateLabel: string;
  locationLabel: string | null;
  thumbnailUrl: string | null;
  questionCount: number;
  locators: VnextItemLocator[];
  spatialAction: VnextSpatialAction | null;
  relatedItemId: string | null;
  relatedTitle: string | null;
};

export type VnextItemQuestion = {
  id: string;
  body: string;
  createdAt: string;
  dateLabel: string;
  authorLabel: string;
};

export type VnextPlanMarker = {
  xPct: number;
  yPct: number;
  label: string;
};

export type VnextExploreItemFocus = {
  itemId: string;
  title: string;
  statusLabel: string;
  locationLabel: string | null;
  dateLabel: string;
  detailHref: string;
  planMarker: VnextPlanMarker | null;
  opensPanorama: boolean;
  contextNote: string | null;
};
