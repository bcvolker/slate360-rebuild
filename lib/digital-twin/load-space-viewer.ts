import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDigitalTwinModelUrl } from "./resolve-model-url";
import { resolveTwinViewerKind, type TwinViewerKind } from "./viewer-format";

export type TwinSpaceViewerData = {
  spaceId: string;
  spaceTitle: string;
  spaceStatus: string;
  modelId: string;
  modelTitle: string;
  modelFormat: string;
  modelUrl: string;
  viewerKind: TwinViewerKind;
};

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

  const modelUrl = await resolveDigitalTwinModelUrl(model.storage_key);
  const viewerKind = resolveTwinViewerKind(model.model_format, model.storage_key);

  return {
    spaceId: space.id,
    spaceTitle: space.title,
    spaceStatus: space.status,
    modelId: model.id,
    modelTitle: model.title,
    modelFormat: model.model_format,
    modelUrl,
    viewerKind,
  };
}
