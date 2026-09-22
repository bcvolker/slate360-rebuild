import type { VnextCompareRep, VnextFrameEvidence, VnextVisit } from "./history-types";

const CLIENT_SESSION_STATUSES = new Set(["completed", "signed"]);

export function isClientHistorySession(status: string | null | undefined): boolean {
  return CLIENT_SESSION_STATUSES.has((status ?? "").trim().toLowerCase());
}

/** Physical time for a site record. updated_at is never the visit date. */
export function siteWalkOccurredAt(row: {
  completedAt: string | null;
  startedAt: string | null;
  createdOfflineAt: string | null;
  createdAt: string | null;
}): string | null {
  return row.completedAt || row.startedAt || row.createdOfflineAt || row.createdAt || null;
}

/** Capture upload/create time. Model updated_at is processing, not the visit. */
export function twinOccurredAt(capture: { uploadedAt: string | null; createdAt: string | null } | null, modelCreatedAt: string | null): string | null {
  return capture?.uploadedAt || capture?.createdAt || modelCreatedAt || null;
}

/** Earliest capture record time, else the session was created. Not updated_at. */
export function thermalOccurredAt(captureCreatedAt: string | null, sessionCreatedAt: string | null): string | null {
  return captureCreatedAt || sessionCreatedAt || null;
}

/**
 * Synchronized cameras are allowed only when both models were verified into the same space.
 * A shared space without verification, or two verified models in different spaces, is not enough.
 */
export function cameraSyncIsReliable(a: VnextFrameEvidence | null, b: VnextFrameEvidence | null): boolean {
  if (!a || !b) return false;
  if (!a.spaceId || a.spaceId !== b.spaceId) return false;
  if (a.modelId === b.modelId) return false;
  return a.georeferenceStatus === "VERIFIED" && b.georeferenceStatus === "VERIFIED";
}

export function compareUnavailableCopy(rep: VnextCompareRep): string {
  const label = rep === "360" ? "360" : rep === "reality" ? "Reality" : rep.charAt(0).toUpperCase() + rep.slice(1);
  return `These visits do not share a comparable ${label} view.`;
}

export function comparableReps(a: VnextVisit, b: VnextVisit): VnextCompareRep[] {
  const right = new Set(b.sources.map((source) => source.rep));
  const reps = a.sources.map((source) => source.rep).filter((rep) => right.has(rep));
  if (a.plans.length > 0 && b.plans.length > 0 && !reps.includes("plan")) reps.push("plan");
  return [...new Set(reps)];
}

export function orderVisits(a: VnextVisit, b: VnextVisit): { earlier: VnextVisit; later: VnextVisit } {
  const aMs = Date.parse(a.occurredAt);
  const bMs = Date.parse(b.occurredAt);
  if (aMs === bMs) return a.id <= b.id ? { earlier: a, later: b } : { earlier: b, later: a };
  return aMs < bMs ? { earlier: a, later: b } : { earlier: b, later: a };
}
