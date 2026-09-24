import { qaBucket, type QaSource, type ReleaseRepresentation, type ReviewRecord } from "@/lib/vnext/release/release-rules";
import type { OwnerReleaseFact } from "@/lib/vnext/owner/owner-types";

export type QaItem = {
  projectId: string;
  projectName: string;
  representation: ReleaseRepresentation;
  sourceId: string;
  title: string;
  version: string | null;
  occurredAt: string | null;
  bucket: "needs_review" | "ready_to_publish" | "published" | "rejected";
  note: string | null;
  needsRecapture: boolean;
};

const LABEL: Record<ReleaseRepresentation, string> = {
  reality: "Reality",
  geometry: "Geometry",
  pano360: "360",
  plans: "Plans",
  thermal: "Thermal",
};

export function representationLabel(representation: ReleaseRepresentation): string {
  return LABEL[representation];
}

export function classifyQaItem(
  source: QaSource & { projectName: string; version: string | null },
  review: ReviewRecord | null,
): QaItem | null {
  const bucket = qaBucket(source, review);
  if (!bucket) return null;
  return {
    projectId: source.projectId,
    projectName: source.projectName,
    representation: source.representation,
    sourceId: source.sourceId,
    title: source.title,
    version: source.version,
    occurredAt: source.occurredAt,
    bucket,
    note: review?.note ?? null,
    needsRecapture: review?.needsRecapture ?? false,
  };
}

export function releaseFactsFromQa(items: readonly QaItem[]): OwnerReleaseFact[] {
  return items.flatMap((item) => {
    if (item.bucket !== "needs_review" && item.bucket !== "ready_to_publish") return [];
    const label = representationLabel(item.representation);
    return [{
      id: `${item.representation}-${item.sourceId}`,
      projectId: item.projectId,
      representation: item.representation,
      sourceId: item.sourceId,
      title: item.bucket === "needs_review" ? `${label} is ready for review` : `${label} is ready to publish`,
      bucket: item.bucket,
      occurredAt: item.occurredAt,
    }];
  });
}
