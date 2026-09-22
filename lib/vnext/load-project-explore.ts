import "server-only";

import { getScopedProjectForUser } from "@/lib/projects/access";
import { loadPortfolioEvidence } from "@/lib/vnext/load-portfolio-evidence";
import { loadPanoSources, resolvePanoSourceData } from "@/lib/vnext/explore/resolve-pano-source";
import { loadPlanSources, resolvePlanSourceData } from "@/lib/vnext/explore/resolve-plan-source";
import {
  normalizeExploreRep,
  resolveActiveRepresentation,
} from "@/lib/vnext/explore/resolve-active-representation";
import { resolveThermalSourceData } from "@/lib/vnext/explore/resolve-thermal-source";
import { resolveTwinSourceData } from "@/lib/vnext/explore/resolve-twin-source";
import { vnextProjectHref } from "@/lib/vnext/nav";
import { canClientSeeRepresentation } from "@/lib/vnext/scope/filter-client-surface";
import { readClientScope } from "@/lib/vnext/scope/read-project-scope";
import {
  VNEXT_EXPLORE_REPRESENTATIONS,
  type VnextExploreData,
  type VnextExploreSourceData,
} from "@/lib/vnext/explore-types";

export { normalizeExploreRep } from "@/lib/vnext/explore/resolve-active-representation";

export async function loadVnextExploreData(
  userId: string,
  projectId: string,
  requestedRep: string | null,
  requestedSourceId: string | null,
): Promise<VnextExploreData | null> {
  const { admin, project } = await getScopedProjectForUser(userId, projectId, "id, name");
  if (!project) return null;
  const row = project as unknown as { id: string; name: string };
  if (!row.id || !row.name) return null;

  const evidenceById = await loadPortfolioEvidence(admin, [row.id]);
  const evidenceReps = evidenceById[row.id]?.representations ?? [];
  const availableRepresentations = VNEXT_EXPLORE_REPRESENTATIONS.filter((rep) =>
    (evidenceReps as readonly string[]).includes(rep),
  );

  const sourcesByRepresentation: VnextExploreData["sourcesByRepresentation"] = {};
  if (availableRepresentations.includes("360")) {
    sourcesByRepresentation["360"] = await loadPanoSources(admin, row.id);
  }
  if (availableRepresentations.includes("plan")) {
    sourcesByRepresentation["plan"] = await loadPlanSources(admin, row.id);
  }

  const scope = await readClientScope(admin, row.id);
  const requestedRaw = normalizeExploreRep(requestedRep);
  const requestedAllowed = Boolean(requestedRaw && canClientSeeRepresentation(scope, requestedRaw));
  const requested = requestedAllowed ? requestedRaw : null;
  const sourceId = requestedAllowed ? requestedSourceId : null;
  const decision = resolveActiveRepresentation(availableRepresentations, requested);
  const activeRepresentation = decision.representation;
  let activeSourceError = decision.unavailableError;

  let activeSourceId: string | null = null;
  let activeSourceData: VnextExploreSourceData | null = null;

  if (activeRepresentation) {
    try {
      if (activeRepresentation === "reality") {
        const reality = await resolveTwinSourceData(admin, row.id, "splat", "Reality", sourceId);
        activeSourceData = reality;
        activeSourceId = reality ? sourceId : null;
      } else if (activeRepresentation === "geometry") {
        const geometry = await resolveTwinSourceData(admin, row.id, "model", "Geometry", sourceId);
        activeSourceData = geometry;
        activeSourceId = geometry ? sourceId : null;
      } else if (activeRepresentation === "360") {
        const resolved = await resolvePanoSourceData(admin, row.id, sourceId);
        activeSourceId = resolved?.sourceId ?? null;
        activeSourceData = resolved?.data ?? null;
      } else if (activeRepresentation === "plan") {
        const resolved = await resolvePlanSourceData(admin, row.id, sourceId);
        activeSourceId = resolved?.sourceId ?? null;
        activeSourceData = resolved?.data ?? null;
      } else if (activeRepresentation === "thermal") {
        activeSourceData = await resolveThermalSourceData(admin, row.id, sourceId);
        activeSourceId = activeSourceData ? sourceId : null;
      }
    } catch {
      activeSourceData = null;
    }
    if (!activeSourceData && !activeSourceError) {
      activeSourceError = "This representation could not be loaded right now. Try again or switch to another.";
    }
  }

  return {
    projectId: row.id,
    projectName: row.name,
    availableRepresentations,
    sourcesByRepresentation,
    activeRepresentation,
    activeSourceId,
    activeSourceData,
    activeSourceError,
    overviewHref: vnextProjectHref(row.id),
  };
}
