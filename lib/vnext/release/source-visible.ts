import "server-only";

import { isOwnerEmail } from "@/lib/server/beta-access";
import { publishedIdSet, readProjectPublications } from "./read-publications";
import type { PublicationRecord } from "./release-rules";

type Admin = Parameters<typeof readProjectPublications>[0];

/** A client may stream a source only after it is published. The operations owner may open it for QA. */
export async function clientMayReadSource(
  admin: Admin,
  projectId: string,
  representation: PublicationRecord["representation"],
  sourceId: string,
  userEmail: string | null | undefined,
): Promise<boolean> {
  if (isOwnerEmail(userEmail)) return true;
  try {
    const rows = await readProjectPublications(admin, projectId);
    return publishedIdSet(rows, projectId, representation).has(sourceId);
  } catch {
    return false;
  }
}
