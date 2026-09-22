import "server-only";

import { getScopedProjectForUser } from "@/lib/projects/access";
import { vnextProjectHref } from "@/lib/vnext/nav";
import { readProjectHistory } from "./read-project-history";
import type { VnextVisit } from "./history-types";

export type HistoryPageResult =
  | { access: "denied" }
  | { access: "ok"; visits: VnextVisit[]; error: string | null };

export async function loadVnextProjectHistory(userId: string, projectId: string): Promise<HistoryPageResult> {
  const { admin, project } = await getScopedProjectForUser(userId, projectId, "id");
  if (!project) return { access: "denied" };
  const base = vnextProjectHref(projectId);
  const read = await readProjectHistory(admin, projectId, {
    exploreBase: `${base}/explore`,
    itemsBase: `${base}/items`,
  });
  return { access: "ok", visits: read.visits, error: read.error };
}
