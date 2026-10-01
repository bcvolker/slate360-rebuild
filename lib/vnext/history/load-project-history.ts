import "server-only";

import { getScopedProjectForUser } from "@/lib/projects/access";
import { vnextProjectHref } from "@/lib/vnext/nav";
import { readProjectHistory } from "./read-project-history";
import type { VnextVisit } from "./history-types";
import { filterVisitsForScope } from "@/lib/vnext/scope/filter-client-surface";
import { canClientSeeCapability } from "@/lib/vnext/scope/resolve-client-scope";
import { readClientScope } from "@/lib/vnext/scope/read-project-scope";

export type HistoryPageResult =
  | { access: "denied" }
  | { access: "hidden" }
  | { access: "ok"; visits: VnextVisit[]; error: string | null; canCompare: boolean };

export async function loadVnextProjectHistory(userId: string, projectId: string): Promise<HistoryPageResult> {
  const { admin, project } = await getScopedProjectForUser(userId, projectId, "id");
  if (!project) return { access: "denied" };
  const scope = await readClientScope(admin, projectId);
  if (!canClientSeeCapability(scope, "history")) return { access: "hidden" };
  const base = vnextProjectHref(projectId);
  const read = await readProjectHistory(admin, projectId, {
    exploreBase: `${base}/explore`,
    itemsBase: `${base}/items`,
  });
  return {
    access: "ok",
    visits: filterVisitsForScope(read.visits, scope),
    error: read.error,
    canCompare: canClientSeeCapability(scope, "compare"),
  };
}
