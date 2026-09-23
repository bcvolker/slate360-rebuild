export const RELEASE_REPRESENTATIONS = ["reality", "geometry", "pano360", "plans", "thermal"] as const;

export type ReleaseRepresentation = (typeof RELEASE_REPRESENTATIONS)[number];

export type PublicationRecord = {
  projectId: string;
  representation: Exclude<ReleaseRepresentation, "thermal">;
  sourceId: string;
  revokedAt: string | null;
};

export type ReviewDecision = "approved" | "rejected";

export type ReviewRecord = {
  projectId: string;
  representation: ReleaseRepresentation;
  sourceId: string;
  decision: ReviewDecision;
  note: string | null;
  needsRecapture: boolean;
};

export function isReleaseRepresentation(value: string): value is ReleaseRepresentation {
  return (RELEASE_REPRESENTATIONS as readonly string[]).includes(value);
}

export function activePublishedIds(
  rows: readonly PublicationRecord[],
  projectId: string,
  representation: PublicationRecord["representation"],
): Set<string> {
  return new Set(
    rows
      .filter((row) => row.projectId === projectId && row.representation === representation && !row.revokedAt)
      .map((row) => row.sourceId),
  );
}

/** Publishing source B adds B. It does not revoke A, even in the same representation. */
export function publishRecords(
  rows: readonly PublicationRecord[],
  next: Omit<PublicationRecord, "revokedAt">,
): PublicationRecord[] {
  const rest = rows.filter(
    (row) => !(row.projectId === next.projectId && row.representation === next.representation && row.sourceId === next.sourceId),
  );
  return [...rest, { ...next, revokedAt: null }];
}

/** Automatic backfill has no actor. Drop it only when that service is not included. */
export function automaticBackfillShouldDrop(row: { publishedBy: string | null; included: boolean }): boolean {
  return row.publishedBy == null && !row.included;
}

export function publishBlockReason(input: { included: boolean; decision: ReviewDecision | null }): "not_included" | "not_approved" | null {
  if (!input.included) return "not_included";
  if (input.decision !== "approved") return "not_approved";
  return null;
}

export function revokeRecord(
  rows: readonly PublicationRecord[],
  target: Pick<PublicationRecord, "projectId" | "representation" | "sourceId">,
): PublicationRecord[] {
  return rows.map((row) =>
    row.projectId === target.projectId && row.representation === target.representation && row.sourceId === target.sourceId && !row.revokedAt
      ? { ...row, revokedAt: "revoked" }
      : row,
  );
}

export type QaSource = {
  projectId: string;
  representation: ReleaseRepresentation;
  sourceId: string;
  title: string;
  occurredAt: string | null;
  included: boolean;
  published: boolean;
};

export type QaBucket = "needs_review" | "ready_to_publish" | "published" | "rejected";

export function qaBucket(source: QaSource, review: ReviewRecord | null): QaBucket | null {
  if (!source.included) return null;
  if (source.published) return "published";
  if (review?.decision === "rejected") return "rejected";
  if (review?.decision === "approved") return "ready_to_publish";
  return "needs_review";
}

export function capabilityForRepresentation(representation: ReleaseRepresentation): "reality" | "geometry" | "pano360" | "plans" | "thermal" {
  return representation;
}
