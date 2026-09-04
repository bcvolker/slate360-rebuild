/**
 * Client Experience data contract.
 *
 * Everything the contractor-facing AOB205 views render comes through this
 * shape. `lib/client-experience/aob205-fixture.ts` fills it from real AOB205
 * assets today; the portal-token loader should produce the same shape from
 * spatial_walkthroughs / spatial_pins / spatial_project_items / plan sheets
 * once those are ingested (see AOB205_UX_HANDOFF.md).
 *
 * Plan coordinates are fractions of the sheet image (u → x, v → y, 0..1).
 */

export type ModalityKind = "walkthrough" | "twin" | "stations" | "aerial";

export type ClientBrand = {
  /** Contractor / client organisation name shown in the shell. */
  name: string;
  logoUrl: string | null;
  /** Optional accent override; falls back to the platform accent. */
  accent?: string | null;
  showPoweredBy: boolean;
};

export type ProjectIdentity = {
  name: string;
  code?: string | null;
  location?: string | null;
  coverUrl: string;
};

export type Visit = {
  id: string;
  /** ISO date-time of the capture. */
  capturedAt: string;
  label: string;
  modalities: ModalityKind[];
  thumbUrl: string;
};

export type PlanSheet = {
  id: string;
  title: string;
  sheetNumber: string;
  imageUrl: string;
  width: number;
  height: number;
  /** Region of interest (fractions) the viewer should frame first. */
  focus: { u0: number; v0: number; u1: number; v1: number };
  /** Approximate scale, used only for the plan scale bar (not for measurement). */
  approxMetresPerU?: number;
};

export type PlanPoint = { u: number; v: number };

export type Waypoint = PlanPoint & {
  id: string;
  /** Seconds into the walkthrough clip. */
  t: number;
  label: string;
  space: string;
  /** Yaw (deg) inside the sphere at which the path continues forward. */
  forwardYaw: number;
};

export type WalkthroughClip = {
  id: string;
  visitId: string;
  videoUrl: string;
  posterUrl: string;
  durationS: number;
  waypoints: Waypoint[];
  /** Ordered list of spaces along the walk (derived from waypoints). */
  spaces: string[];
};

export type Station = PlanPoint & {
  id: string;
  visitId: string;
  label: string;
  space: string;
  capturedAt: string;
  imageUrl: string;
  thumbUrl: string;
  /** Yaw (deg) of plan-north inside this station's sphere. */
  northYaw: number;
  /** Adjacent stations with the yaw at which their arrow should appear. */
  neighbors: { id: string; yawDeg: number }[];
};

export type TwinModel = {
  id: string;
  visitId: string;
  label: string;
  splatUrl: string;
};

export type ItemType = "rfi" | "issue" | "note" | "document" | "photo";
export type ItemStatus = "open" | "in_progress" | "resolved";

export type SpatialRef =
  | { kind: "plan"; label: string; u: number; v: number }
  | { kind: "walkthrough"; label: string; t: number; yaw: number; pitch: number }
  | { kind: "station"; label: string; stationId: string; yaw: number; pitch: number }
  | { kind: "twin"; label: string; xyz: [number, number, number] };

export type Attachment = {
  id: string;
  title: string;
  kind: "pdf" | "image" | "link";
  url: string;
  thumbUrl?: string;
  meta?: string;
};

export type Comment = {
  id: string;
  author: string;
  role: "client" | "slate360";
  at: string;
  body: string;
};

export type ActivityEntry = {
  id: string;
  at: string;
  summary: string;
  itemId?: string;
};

export type ProjectItem = {
  id: string;
  title: string;
  type: ItemType;
  status: ItemStatus;
  description: string;
  createdAt: string;
  refs: SpatialRef[];
  attachments: Attachment[];
  comments: Comment[];
  activity: ActivityEntry[];
};

export type ProjectDocument = Attachment & {
  /** Number of spatial references pointing at this document. */
  refCount: number;
  sheetId?: string;
};

export type ProjectExperience = {
  brand: ClientBrand;
  project: ProjectIdentity;
  visits: Visit[];
  latestVisitId: string;
  plan: PlanSheet | null;
  walkthrough: WalkthroughClip | null;
  twin: TwinModel | null;
  stations: Station[];
  items: ProjectItem[];
  documents: ProjectDocument[];
  activity: ActivityEntry[];
  shareUrl: string | null;
  /** Base path all in-experience links are built from. */
  basePath: string;
};
