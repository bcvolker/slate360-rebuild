import type { VnextRepresentation } from "./portfolio-types";

/** Representations Explore can ever render. Drone is deliberately absent — no proven viewer. */
export const VNEXT_EXPLORE_REPRESENTATIONS = [
  "reality",
  "geometry",
  "360",
  "plan",
  "thermal",
] as const satisfies readonly VnextRepresentation[];

export type VnextExploreRepresentation = (typeof VNEXT_EXPLORE_REPRESENTATIONS)[number];

/** One selectable source within a representation (a specific model / photo / sheet / session). */
export type VnextExploreSourceSummary = {
  id: string;
  label: string;
  dateLabel: string | null;
};

export type VnextRealitySourceData = {
  kind: "reality";
  modelId?: string;
  viewerKind: "splat" | "model";
  modelUrl: string;
  modelTitle: string;
};

export type VnextGeometrySourceData = {
  kind: "geometry";
  viewerKind: "model";
  modelUrl: string;
  modelTitle: string;
};

export type VnextPanoSourceData = {
  kind: "360";
  imageUrl: string;
  title: string;
};

export type VnextPlanSourceData = {
  kind: "plan";
  imageUrl: string;
  sheetName: string;
};

export type VnextThermalCapture = {
  id: string;
  imageUrl: string;
  label: string;
};

export type VnextThermalSourceData = {
  kind: "thermal";
  sessionName: string;
  captures: VnextThermalCapture[];
};

export type VnextExploreSourceData =
  | VnextRealitySourceData
  | VnextGeometrySourceData
  | VnextPanoSourceData
  | VnextPlanSourceData
  | VnextThermalSourceData;

export type VnextExploreData = {
  projectId: string;
  projectName: string;
  /** Every representation with at least one proven, renderable source. Reuses the same shared
   *  evidence contract Overview uses (lib/vnext/load-portfolio-evidence.ts) — never a second
   *  definition of "available". */
  availableRepresentations: VnextExploreRepresentation[];
  /** Selectable sources per representation, for the source picker. Empty array if the
   *  representation has exactly one implicit source (nothing to pick between). */
  sourcesByRepresentation: Partial<Record<VnextExploreRepresentation, VnextExploreSourceSummary[]>>;
  /** The representation actually being shown — resolved from the requested ?rep=, falling back to
   *  the priority order when absent/invalid. Null only when availableRepresentations is empty. */
  activeRepresentation: VnextExploreRepresentation | null;
  /** The specific source id actually being shown, when the active representation has more than
   *  one selectable source. */
  activeSourceId: string | null;
  /** Full viewer-ready data for the active representation/source. Null if there is nothing to
   *  show (no representations) or if resolving the active source's data failed. */
  activeSourceData: VnextExploreSourceData | null;
  /** True when a representation/source was explicitly requested via the URL but could not be
   *  resolved to real data (unavailable rep, unknown source id, or a load failure). */
  activeSourceError: string | null;
  overviewHref: string;
};
