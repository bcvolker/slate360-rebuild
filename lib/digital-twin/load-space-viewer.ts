import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDigitalTwinModelUrl } from "./resolve-model-url";
import { resolveTwinViewerKind } from "./viewer-format";
import type { TwinGpsMetadata, TwinSpaceViewerData } from "./viewer-types";

export type { TwinSpaceViewerData } from "./viewer-types";

function parseCaptureGps(metadata: unknown): TwinGpsMetadata | null {
  if (!metadata || typeof metadata !== "object") return null;
  const gps = (metadata as Record<string, unknown>).gps;
  if (!gps || typeof gps !== "object") return null;
  const g = gps as Record<string, unknown>;
  if (typeof g.lat !== "number" || typeof g.lng !== "number") return null;
  return {
    lat: g.lat,
    lng: g.lng,
    ...(typeof g.alt === "number" ? { alt: g.alt } : {}),
    ...(typeof g.accuracy === "number" ? { accuracy: g.accuracy } : {}),
    ...(typeof g.capturedAt === "string" ? { capturedAt: g.capturedAt } : {}),
  };
}

export async function loadTwinSpaceViewerData(
  spaceId: string,
  orgId: string | null,
): Promise<TwinSpaceViewerData | null> {
  if (!orgId) return null;

  const admin = createAdminClient();

  const { data: space, error: spaceError } = await admin
    .from("digital_twin_spaces")
    .select("id, org_id, title, status, published_model_id")
    .eq("id", spaceId)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (spaceError || !space) return null;

  let modelQuery = admin
    .from("digital_twin_models")
    .select("id, title, model_format, storage_key, status, is_primary")
    .eq("space_id", spaceId)
    .eq("org_id", orgId)
    .eq("status", "ready")
    .is("deleted_at", null);

  if (space.published_model_id) {
    modelQuery = modelQuery.eq("id", space.published_model_id);
  } else {
    modelQuery = modelQuery.eq("is_primary", true);
  }

  const { data: model, error: modelError } = await modelQuery.maybeSingle();
  if (modelError || !model?.storage_key) return null;

  const viewerKind = resolveTwinViewerKind(model.model_format, model.storage_key);
  // Splats stream through a same-origin proxy (no cross-origin R2 CORS → no synchronous throw in
  // the Spark loader that was blocking every twin from opening). Other kinds keep the presigned URL.
  const modelUrl =
    viewerKind === "splat"
      ? `/api/digital-twin/models/${model.id}/splat`
      : await resolveDigitalTwinModelUrl(model.storage_key);

  const { data: latestCapture } = await admin
    .from("digital_twin_captures")
    .select("capture_metadata")
    .eq("space_id", spaceId)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestGps = parseCaptureGps(latestCapture?.capture_metadata ?? null);

  return {
    spaceId: space.id,
    spaceTitle: space.title,
    spaceStatus: space.status,
    modelId: model.id,
    modelTitle: model.title,
    modelFormat: model.model_format,
    modelUrl,
    viewerKind,
    latestGps,
  };
}
