/** Directed Tour data model. Route position, media time and visit date are separate fields. */
import type { LookCone } from "./look-cone";

export type MatchQuality = "matched" | "same_chapter" | "not_captured";
export type StillStatus = "none" | "queued" | "ready" | "failed";

export type TourRoute = {
  id: string;
  projectId: string;
  name: string;
  revision: number;
  captureNotes: string | null;
};

export type RouteChapter = {
  id: string;
  name: string;
  sortOrder: number;
  retiredAt: string | null;
  replacedBy: string | null;
};

export type RouteCheckpoint = {
  id: string;
  chapterId: string;
  label: string;
  captureNote: string | null;
  sortOrder: number;
  introducedInRevision: number;
  retiredAt: string | null;
  replacedBy: string | null;
};

export type CheckpointMark = {
  id: string;
  checkpointId: string;
  walkthroughId: string;
  clipId: string | null;
  /** Seconds on the clip's public (operator-free) proxy. */
  tSeconds: number | null;
  yawDeg: number;
  pitchDeg: number;
  match: MatchQuality;
  stillKey: string | null;
  stillStatus: StillStatus;
  stillError: string | null;
  /** Pure-black share of the published still, measured by the worker (null = not measured). */
  stillBlackFraction: number | null;
};

export type TourClip = {
  id: string;
  durationS: number | null;
  sortOrder: number;
  /** Operator-free derivative exists; only these clips can be marked or published. */
  hasPublicProxy: boolean;
  /** Published view clients are look-locked to; null until the operator sets it. */
  lookCone: LookCone | null;
  /** The baked privacy paint reaches into the published view (clients would see black). */
  maskVisible: boolean;
  /** Largest share of the sphere the paint covers. */
  maskCoverage: number;
};

export type TourVisit = {
  walkthroughId: string;
  title: string;
  capturedAt: string | null;
  routeId: string | null;
  clientPublishedAt: string | null;
  stillsReviewedAt: string | null;
  privacyReviewedAt: string | null;
  clips: TourClip[];
};

export type TourBundle = {
  route: TourRoute | null;
  chapters: RouteChapter[];
  checkpoints: RouteCheckpoint[];
  visits: TourVisit[];
  marks: CheckpointMark[];
};
