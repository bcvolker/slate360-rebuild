import "server-only";

import { loadPortfolioEvidence } from "@/lib/vnext/load-portfolio-evidence";
import { loadPanoSources, resolvePanoSourceData } from "@/lib/vnext/explore/resolve-pano-source";
import { loadPlanSources, resolvePlanSourceData } from "@/lib/vnext/explore/resolve-plan-source";
import { normalizeExploreRep, resolveActiveRepresentation } from "@/lib/vnext/explore/resolve-active-representation";
import { resolveTwinSourceData } from "@/lib/vnext/explore/resolve-twin-source";
import { canClientSeeRepresentation } from "@/lib/vnext/scope/filter-client-surface";
import { readClientScope } from "@/lib/vnext/scope/read-project-scope";
import { VNEXT_EXPLORE_REPRESENTATIONS, type VnextExploreData, type VnextExploreRepresentation } from "@/lib/vnext/explore-types";
import { lockExploreToSource, retargetExploreMedia } from "./share-rules";

type Admin = any;

export async function loadPublicExplore(
  admin: Admin,
  project: { id: string; name: string },
  token: string,
  requestedRep: string | null,
  requestedSourceId: string | null,
  lock: { representation: VnextExploreRepresentation; sourceId: string } | null,
): Promise<VnextExploreData | null> {
  const evidenceById = await loadPortfolioEvidence(admin, [project.id]);
  const evidenceReps = evidenceById[project.id]?.representations ?? [];
  const availableRepresentations = VNEXT_EXPLORE_REPRESENTATIONS.filter(
    (rep) => rep !== "thermal" && (evidenceReps as readonly string[]).includes(rep),
  );
  const sourcesByRepresentation: VnextExploreData["sourcesByRepresentation"] = {};
  if (availableRepresentations.includes("360")) sourcesByRepresentation["360"] = await loadPanoSources(admin, project.id);
  if (availableRepresentations.includes("plan")) sourcesByRepresentation.plan = await loadPlanSources(admin, project.id);

  const scope = await readClientScope(admin, project.id);
  const requestedRaw = lock?.representation ?? normalizeExploreRep(requestedRep);
  const requestedAllowed = Boolean(requestedRaw && requestedRaw !== "thermal" && canClientSeeRepresentation(scope, requestedRaw));
  const sourceId = lock ? lock.sourceId : requestedAllowed ? requestedSourceId : null;
  const decision = resolveActiveRepresentation(availableRepresentations, requestedAllowed ? requestedRaw : null);
  const activeRepresentation = decision.representation;
  let activeSourceError = decision.unavailableError;
  let activeSourceId: string | null = null;
  let activeSourceData: VnextExploreData["activeSourceData"] = null;

  if (activeRepresentation && activeRepresentation !== "thermal") {
    try {
      if (activeRepresentation === "reality" || activeRepresentation === "geometry") {
        const kind = activeRepresentation === "reality" ? "splat" : "model";
        const label = activeRepresentation === "reality" ? "Reality" : "Geometry";
        activeSourceData = await resolveTwinSourceData(admin, project.id, kind, label, sourceId);
        activeSourceId = activeSourceData ? sourceId : null;
      } else if (activeRepresentation === "360") {
        const resolved = await resolvePanoSourceData(admin, project.id, sourceId);
        activeSourceId = resolved?.sourceId ?? null;
        activeSourceData = resolved?.data ?? null;
      } else if (activeRepresentation === "plan") {
        const resolved = await resolvePlanSourceData(admin, project.id, sourceId);
        activeSourceId = resolved?.sourceId ?? null;
        activeSourceData = resolved?.data ?? null;
      }
    } catch {
      activeSourceData = null;
    }
    if (!activeSourceData && !activeSourceError) {
      activeSourceError = "This representation could not be loaded right now. Try again or switch to another.";
    }
  }

  const data = retargetExploreMedia(
    {
      projectId: project.id,
      projectName: project.name,
      availableRepresentations,
      sourcesByRepresentation,
      activeRepresentation,
      activeSourceId,
      activeSourceData,
      activeSourceError,
      overviewHref: "",
    },
    token,
  );
  if (!lock) return data;
  return lockExploreToSource(data, lock.representation, lock.sourceId);
}
