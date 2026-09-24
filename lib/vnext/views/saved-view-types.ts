import type { VnextExploreRepresentation } from "@/lib/vnext/explore-types";

export const SAVED_VIEW_ASPECTS = ["16:9", "9:16", "1:1"] as const;
export type SavedViewAspect = (typeof SAVED_VIEW_ASPECTS)[number];

export type SavedCameraState = {
  kind: "camera";
  position: [number, number, number];
  lookAt: [number, number, number];
};

export type SavedPanoState = {
  kind: "pano";
  yaw: number;
  pitch: number;
};

export type SavedPlanState = {
  kind: "plan";
  scale: number;
  x: number;
  y: number;
};

export type SavedThermalState = {
  kind: "thermal";
  captureId: string;
};

export type SavedViewState = SavedCameraState | SavedPanoState | SavedPlanState | SavedThermalState;

/** Provenance for one exact captured view. Camera fields are omitted when the viewer cannot supply them. */
export type VnextSavedView = {
  id: string;
  projectId: string;
  title: string;
  representation: VnextExploreRepresentation;
  sourceId: string;
  visitId: string | null;
  occurredAt: string | null;
  itemId: string | null;
  planSheetId: string | null;
  viewState: SavedViewState | null;
  aspect: SavedViewAspect | null;
  createdAt: string;
};

export type SavedViewDraft = {
  title: string;
  representation: string;
  sourceId: string;
  visitId?: string | null;
  occurredAt?: string | null;
  itemId?: string | null;
  planSheetId?: string | null;
  viewState?: unknown;
  aspect?: string | null;
};
