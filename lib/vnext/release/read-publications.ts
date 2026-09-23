import "server-only";

import type { PublicationRecord, ReleaseRepresentation } from "./release-rules";
import { activePublishedIds } from "./release-rules";

type Admin = any;

export class PublicationReadError extends Error {}

export async function readProjectPublications(admin: Admin, projectId: string): Promise<PublicationRecord[]> {
  const result = await admin
    .from("project_source_publications")
    .select("project_id, representation, source_id, revoked_at")
    .eq("project_id", projectId);
  if (result.error) throw new PublicationReadError(result.error.message);
  return asRecords(result.data);
}

export async function readPublicationsForProjects(admin: Admin, projectIds: string[]): Promise<PublicationRecord[]> {
  if (projectIds.length === 0) return [];
  const result = await admin
    .from("project_source_publications")
    .select("project_id, representation, source_id, revoked_at")
    .in("project_id", projectIds);
  if (result.error) throw new PublicationReadError(result.error.message);
  return asRecords(result.data);
}

export function publishedIdSet(
  rows: readonly PublicationRecord[],
  projectId: string,
  representation: Exclude<ReleaseRepresentation, "thermal">,
): Set<string> {
  return activePublishedIds(rows, projectId, representation);
}

function asRecords(data: unknown): PublicationRecord[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    const record = row as { project_id?: string; representation?: string; source_id?: string; revoked_at?: string | null };
    if (!record.project_id || !record.source_id || !record.representation) return [];
    if (record.representation === "thermal") return [];
    return [{
      projectId: record.project_id,
      representation: record.representation as PublicationRecord["representation"],
      sourceId: record.source_id,
      revokedAt: record.revoked_at ?? null,
    }];
  });
}
