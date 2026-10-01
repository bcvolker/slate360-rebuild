import "server-only";

import { resolvePanoSourceData } from "@/lib/vnext/explore/resolve-pano-source";
import { resolvePlanSourceData } from "@/lib/vnext/explore/resolve-plan-source";
import { resolveThermalSourceData } from "@/lib/vnext/explore/resolve-thermal-source";
import { loadThermalShareViewerData } from "@/lib/thermal/load-share-viewer";
import { resolveTwinSourceData } from "@/lib/vnext/explore/resolve-twin-source";
import { loadVnextExploreData } from "@/lib/vnext/load-project-explore";
import { canClientSeeRepresentation } from "@/lib/vnext/scope/filter-client-surface";
import { readClientScope } from "@/lib/vnext/scope/read-project-scope";
import type { VnextExploreData, VnextExploreRepresentation, VnextExploreSourceData } from "@/lib/vnext/explore-types";
import { isReleaseRepresentation, type ReleaseRepresentation } from "@/lib/vnext/release/release-rules";

type Admin = any;

const EXPLORE_REP: Record<ReleaseRepresentation, VnextExploreRepresentation> = {
  reality: "reality",
  geometry: "geometry",
  pano360: "360",
  plans: "plan",
  thermal: "thermal",
};

export async function loadOwnerClientPreview(
  userId: string,
  admin: Admin,
  projectId: string,
  candidate: { representation: string; sourceId: string } | null,
): Promise<VnextExploreData | null> {
  const data = await loadVnextExploreData(userId, projectId, null, null);
  if (!data || !candidate || !isReleaseRepresentation(candidate.representation)) return data;
  return withCandidateSource(admin, data, { representation: candidate.representation, sourceId: candidate.sourceId });
}

export async function withCandidateSource(
  admin: Admin,
  data: VnextExploreData,
  candidate: { representation: ReleaseRepresentation; sourceId: string },
): Promise<VnextExploreData> {
  const scope = await readClientScope(admin, data.projectId);
  const rep = EXPLORE_REP[candidate.representation];
  if (!canClientSeeRepresentation(scope, rep)) return data;
  const resolved = await loadOwnerSourcePreview(admin, data.projectId, candidate.representation, candidate.sourceId);
  if (!resolved) return data;
  const available = data.availableRepresentations.includes(rep)
    ? data.availableRepresentations
    : [...data.availableRepresentations, rep];
  return {
    ...data,
    availableRepresentations: available,
    activeRepresentation: rep,
    activeSourceId: candidate.sourceId,
    activeSourceData: resolved,
    activeSourceError: null,
  };
}

export async function loadOwnerSourcePreview(
  admin: Admin,
  projectId: string,
  representation: ReleaseRepresentation,
  sourceId: string,
): Promise<VnextExploreSourceData | null> {
  const options = { includeUnpublished: true };
  if (representation === "reality") return resolveTwinSourceData(admin, projectId, "splat", "Reality", sourceId, options);
  if (representation === "geometry") return resolveTwinSourceData(admin, projectId, "model", "Geometry", sourceId, options);
  if (representation === "pano360") return (await resolvePanoSourceData(admin, projectId, sourceId, options))?.data ?? null;
  if (representation === "plans") return (await resolvePlanSourceData(admin, projectId, sourceId, options))?.data ?? null;
  const published = await resolveThermalSourceData(admin, projectId, sourceId);
  if (published) return published;
  const { data: session } = await admin.from("thermal_analysis_sessions").select("id, name").eq("id", sourceId).eq("project_id", projectId).is("deleted_at", null).maybeSingle();
  if (!session) return null;
  const viewerData = await loadThermalShareViewerData(sourceId, {}, {});
  const captures = (viewerData?.captures ?? []).filter((capture) => capture.previewUrl).map((capture) => ({
    id: capture.id,
    imageUrl: capture.previewUrl as string,
    label: capture.filename ?? "Capture",
  }));
  if (captures.length === 0) return null;
  return { kind: "thermal", sessionName: viewerData?.sessionName || String(session.name ?? "Thermal"), captures };
}

export function parseCandidate(representation: string, sourceId: string): { representation: ReleaseRepresentation; sourceId: string } | null {
  if (!isReleaseRepresentation(representation) || !sourceId) return null;
  return { representation, sourceId };
}
