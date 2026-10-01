import "server-only";

import { readProjectHistory } from "@/lib/vnext/history/read-project-history";
import type { VnextVisit } from "@/lib/vnext/history/history-types";
import { filterVisitsForScope } from "@/lib/vnext/scope/filter-client-surface";
import { canClientSeeCapability } from "@/lib/vnext/scope/resolve-client-scope";
import { readClientScope } from "@/lib/vnext/scope/read-project-scope";
import { preparePublicVisits, sharePath } from "./share-rules";

type Admin = any;

export async function loadPublicHistory(
  admin: Admin,
  projectId: string,
  token: string,
): Promise<{ visits: VnextVisit[]; error: string | null; canCompare: boolean } | null> {
  const scope = await readClientScope(admin, projectId);
  if (!canClientSeeCapability(scope, "history")) return null;
  const base = sharePath(token);
  const read = await readProjectHistory(admin, projectId, {
    exploreBase: `${base}/explore`,
    itemsBase: base,
  });
  return {
    visits: preparePublicVisits(filterVisitsForScope(read.visits, scope), projectId, token),
    error: read.error,
    canCompare: canClientSeeCapability(scope, "compare"),
  };
}
