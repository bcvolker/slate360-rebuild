import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  resolveTwinShareModel,
  type TwinShareModelResult,
  type TwinShareModelRow,
} from "./share-model";

export async function resolveTwinShareLidarModel(
  token: string,
  requestedModelId?: string | null,
): Promise<TwinShareModelResult> {
  const base = await resolveTwinShareModel(token);
  if (!base.ok) return base;
  if (base.model.model_format === "lidar_potree") return base;

  const admin = createAdminClient();
  let modelQuery = admin
    .from("digital_twin_models")
    .select(
      "id, storage_key, file_size_bytes, model_format, capture_id, quality_metrics, org_id, space_id",
    )
    .eq("space_id", base.model.space_id)
    .eq("org_id", base.model.org_id)
    .eq("model_format", "lidar_potree")
    .eq("status", "ready")
    .is("deleted_at", null);
  if (requestedModelId) {
    modelQuery = modelQuery.eq("id", requestedModelId);
  } else {
    modelQuery = modelQuery.order("created_at", { ascending: false }).limit(1);
  }
  const { data: model } = await modelQuery.maybeSingle();
  if (!model?.storage_key) return { ok: false, reason: "unavailable" };

  const lidarModel: TwinShareModelRow = {
    id: model.id,
    storage_key: model.storage_key,
    file_size_bytes: model.file_size_bytes ?? null,
    model_format: model.model_format ?? null,
    capture_id: model.capture_id ?? null,
    quality_metrics: (model.quality_metrics as Record<string, unknown> | null) ?? null,
    org_id: model.org_id,
    space_id: model.space_id,
  };
  return { ok: true, model: lidarModel };
}
