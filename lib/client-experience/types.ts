/**
 * Client Experience data contract.
 *
 * Everything the contractor-facing views render comes through this shape.
 * `aob205-variants.ts` fills it from real AOB205 assets today; the portal
 * loader should produce the same shape from spatial_* tables. Brand and
 * capability shapes are Cursor's (lib/spatial-experience) — not duplicated.
 *
 * Plan coordinates are fractions of the sheet image (u → x, v → y, 0..1).
 */
import type { ProjectBrand } from "../spatial-experience/brand";
import type { ProjectCapabilities } from "../spatial-experience/capabilities";
import type { WalkSegment } from "../spatial-experience/trajectory";

export type ModalityKind = "walkthrough" | "twin" | "stations" | "aerial";

export type ProjectIdentity = {
  name: string;
  code?: string | null;
  location?: string | null;
  coverUrl: string;
};

export type Visit = {
  id: string;
  capturedAt: string;
  label: string;
  modalities: ModalityKind[];
  thumbUrl: string;
};

export type PlanSheet = {
  id: string;
  title: string;
  sheetNumber: string;
  /** Raster of the sheet. Interactive overlay requires this; a PDF alone is a document. */
  imageUrl: string;
  width: number;
  height: number;
  focus: { u0: number; v0: number; u1: number; v1: number };
  pdfUrl?: string | null;
};

export type PlanPoint = { u: number; v: number };

export type Waypoint = PlanPoint & {
  id: string;
  t: number;
  label: string;
  space: string;
  /** Yaw (deg) inside the sphere at which the path continues forward. */
  forwardYaw: number;
  segmentId: string;
};

export type WalkthroughClip = {
  id: string;
  visitId: string;
  videoUrl: string;
  posterUrl: string;
  durationS: number;
  waypoints: Waypoint[];
  spaces: string[];
  /** Recorded-path segments; the path is never drawn across a boundary. */
  segments: WalkSegment[];
};

export type Station = PlanPoint & {
  id: string;
  visitId: string;
  label: string;
  space: string;
  capturedAt: string;
  /** Sharp source for the immersive viewer (standard/full variant). */
  imageUrl: string;
  /** Small optimized thumb for filmstrips — never the ERP source. */
  thumbUrl: string;
  /** Walk time (s) this station was captured at, when it lies on the walk. */
  t?: number | null;
  northYaw: number;
  neighbors: { id: string; yawDeg: number }[];
};

export type TwinModel = {
  id: string;
  visitId: string;
  label: string;
  splatUrl: string;
  /** Explicitly simulated accepted-twin fixture for chrome review only. */
  simulated?: boolean;
};

export type ItemType = "rfi" | "issue" | "note" | "document" | "photo" | "question";
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

export type ActivityEntry = { id: string; at: string; summary: string; itemId?: string };

export type ProjectItem = {
  id: string;
  title: string;
  type: ItemType;
  status: ItemStatus;
  description: string;
  createdAt: string;
  author?: string;
  refs: SpatialRef[];
  attachments: Attachment[];
  comments: Comment[];
  activity: ActivityEntry[];
};

export type ProjectDocument = Attachment & { refCount: number; sheetId?: string };

export type ProjectExperience = {
  brand: ProjectBrand;
  capabilities: ProjectCapabilities;
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
  basePath: string;
  /** Query suffix that keeps the preview variant alive across in-experience links. */
  linkSuffix?: string;
};
