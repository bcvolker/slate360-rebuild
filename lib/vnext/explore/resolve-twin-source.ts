import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDigitalTwinModelUrl } from "@/lib/digital-twin/resolve-model-url";
import { resolveTwinViewerKind } from "@/lib/digital-twin/viewer-format";
import type { VnextGeometrySourceData, VnextRealitySourceData } from "@/lib/vnext/explore-types";
import { publishedIdSet, readProjectPublications } from "@/lib/vnext/release/read-publications";

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
async function publishedModelIds(admin: Admin, projectId: string, wantKind: "splat" | "model"): Promise<Set<string> | null> {
  const rows = await readProjectPublications(admin, projectId);
  return publishedIdSet(rows, projectId, wantKind === "splat" ? "reality" : "geometry");
}

async function findBestTwinModel(
  admin: Admin,
  projectId: string,
  wantKind: "splat" | "model",
  published: Set<string> | null,
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
    if (published && !published.has(model.id)) continue;
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

async function findTwinModelById(
  admin: Admin,
  projectId: string,
  wantKind: "splat" | "model",
  sourceId: string,
  published: Set<string> | null,
): Promise<TwinModelCandidate | null> {
  const { data: spaces } = await admin
    .from("digital_twin_spaces")
    .select("id")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .neq("status", "archived");
  const spaceIds = (spaces ?? []).map((space) => space.id as string);
  if (spaceIds.length === 0) return null;
  const { data: models } = await admin
    .from("digital_twin_models")
    .select("id, model_format, storage_key, title, updated_at, space_id")
    .eq("id", sourceId)
    .is("deleted_at", null)
    .eq("status", "ready");
  const model = (models ?? []).find((row) => spaceIds.includes(row.space_id as string));
  if (!model) return null;
  if (resolveTwinViewerKind(model.model_format ?? "", model.storage_key ?? "") !== wantKind) return null;
  if (published && !published.has(model.id)) return null;
  return {
    id: model.id,
    storageKey: model.storage_key,
    title: (model.title as string | null) ?? null,
    updatedAt: (model.updated_at as string | null) ?? "",
  };
}

export async function resolveTwinSourceData(
  admin: Admin,
  projectId: string,
  wantKind: "splat" | "model",
  label: "Reality" | "Geometry",
  sourceId: string | null = null,
  options?: { includeUnpublished?: boolean },
): Promise<VnextRealitySourceData | VnextGeometrySourceData | null> {
  const published = options?.includeUnpublished ? null : await publishedModelIds(admin, projectId, wantKind);
  const model = sourceId
    ? await findTwinModelById(admin, projectId, wantKind, sourceId, published)
    : await findBestTwinModel(admin, projectId, wantKind, published);
  if (!model) return null;
  const modelTitle = model.title || label;

  if (wantKind === "splat") {
    return {
      kind: "reality",
      viewerKind: "splat",
      // vNext-scoped proxy (project-access contract), not the legacy /api/digital-twin/models/[id]/splat
      // route, which matches the model's org_id against the signed-in user's single org and would
      // wrongly refuse a project_members collaborator whose access comes from a different org. Still a
      // same-origin stream (Spark/three.js can't load a cross-origin presigned URL) — see the route's
      // own comment.
      modelUrl: `/api/vnext/projects/${projectId}/twin-models/${model.id}/splat`,
      modelTitle,
      modelId: model.id,
    };
  }
  return {
    kind: "geometry",
    viewerKind: "model",
    modelUrl: await resolveDigitalTwinModelUrl(model.storageKey),
    modelTitle,
  };
}
