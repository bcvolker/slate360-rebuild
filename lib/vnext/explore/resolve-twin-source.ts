import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDigitalTwinModelUrl } from "@/lib/digital-twin/resolve-model-url";
import { resolveTwinViewerKind } from "@/lib/digital-twin/viewer-format";
import type { VnextGeometrySourceData, VnextRealitySourceData } from "@/lib/vnext/explore-types";

type Admin = ReturnType<typeof createAdminClient>;

type TwinModelCandidate = {
  id: string;
  storageKey: string;
  title: string | null;
  updatedAt: string;
};

/**
 * Finds the best-candidate model for "reality" (splat) or "geometry" (glb/gltf) directly, using
 * the exact same space/model filters lib/vnext/load-portfolio-evidence.ts already uses (deleted_at
 * null + status != "archived" on spaces; deleted_at null + status = "ready" on models) so
 * availability (computed there) and resolution (computed here) never drift. Deliberately does NOT
 * reuse loadTwinSpaceViewerData's "one primary model per space" selection — that logic answers "the
 * best model for this space", not "the best model for this REPRESENTATION across the project's
 * spaces", which can differ when a space has more than one ready model.
 */
async function findBestTwinModel(
  admin: Admin,
  projectId: string,
  wantKind: "splat" | "model",
): Promise<TwinModelCandidate | null> {
  const { data: spaces } = await admin
    .from("digital_twin_spaces")
    .select("id, updated_at")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .neq("status", "archived");
  const spaceIds = (spaces ?? []).map((s) => s.id as string);
  if (spaceIds.length === 0) return null;

  const { data: models } = await admin
    .from("digital_twin_models")
    .select("id, model_format, storage_key, title, updated_at")
    .in("space_id", spaceIds)
    .is("deleted_at", null)
    .eq("status", "ready");

  let best: TwinModelCandidate | null = null;
  for (const model of models ?? []) {
    const kind = resolveTwinViewerKind(model.model_format ?? "", model.storage_key ?? "");
    if (kind !== wantKind) continue;
    const updatedAt = (model.updated_at as string | null) ?? "";
    if (!best || Date.parse(updatedAt) > Date.parse(best.updatedAt)) {
      best = {
        id: model.id,
        storageKey: model.storage_key,
        title: (model.title as string | null) ?? null,
        updatedAt,
      };
    }
  }
  return best;
}

export async function resolveTwinSourceData(
  admin: Admin,
  projectId: string,
  wantKind: "splat" | "model",
  label: "Reality" | "Geometry",
): Promise<VnextRealitySourceData | VnextGeometrySourceData | null> {
  const model = await findBestTwinModel(admin, projectId, wantKind);
  if (!model) return null;
  const modelTitle = model.title || label;

  if (wantKind === "splat") {
    return {
      kind: "reality",
      viewerKind: "splat",
      modelUrl: `/api/digital-twin/models/${model.id}/splat`,
      modelTitle,
    };
  }
  return {
    kind: "geometry",
    viewerKind: "model",
    modelUrl: await resolveDigitalTwinModelUrl(model.storageKey),
    modelTitle,
  };
}
