export type VnextHistoryKind = "site" | "reality" | "thermal" | "pano";

export type VnextCompareRep = "reality" | "geometry" | "360" | "plan" | "thermal";

export type VnextHistorySource = {
  rep: VnextCompareRep;
  label: string;
  sourceId: string;
  exploreHref: string;
  imageHref: string | null;
};

export type VnextHistoryPlanContext = {
  sheetId: string;
  sheetLabel: string;
  revisionLabel: string | null;
  exploreHref: string;
  imageHref: string;
};

export type VnextHistoryItem = {
  id: string;
  title: string;
  href: string;
};

/** Evidence that two Reality models may share one coordinate frame. Absent means they do not. */
export type VnextFrameEvidence = {
  spaceId: string;
  modelId: string;
  georeferenceStatus: string | null;
};

export type VnextVisit = {
  id: string;
  occurredAt: string;
  dateLabel: string;
  title: string;
  kind: VnextHistoryKind;
  kindLabel: string;
  sources: VnextHistorySource[];
  plans: VnextHistoryPlanContext[];
  items: VnextHistoryItem[];
  itemCount: number;
  thumbnailHref: string | null;
  frame: VnextFrameEvidence | null;
};

export const HISTORY_EMPTY_COPY = "No visits recorded yet.";
export const HISTORY_LOAD_ERROR = "Project history could not be loaded. Try again.";
