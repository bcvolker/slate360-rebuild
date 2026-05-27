import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueTwinR2Cleanup } from "@/lib/twin/r2-cleanup";

type AdminClient = SupabaseClient;

/**
 * Soft-deletes a capture asset and queues R2 cleanup when a storage_key exists.
 */
export async function softDeleteTwinCaptureAsset(
  admin: AdminClient,
  params: {
    assetId: string;
    orgId: string;
    deletedBy: string;
  },
): Promise<void> {
  const { data: asset, error: loadError } = await admin
    .from("digital_twin_capture_assets")
    .select("id, org_id, storage_key, file_size_bytes, deleted_at")
    .eq("id", params.assetId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (loadError) throw new Error(loadError.message);
  if (!asset) return;

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("digital_twin_capture_assets")
    .update({
      deleted_at: now,
      deleted_by: params.deletedBy,
      status: "archived",
    })
    .eq("id", params.assetId);

  if (updateError) throw new Error(updateError.message);

  if (asset.storage_key) {
    await enqueueTwinR2Cleanup(admin, {
      orgId: params.orgId,
      storageKey: asset.storage_key,
      bytesFreed: Number(asset.file_size_bytes) || 0,
      sourceTable: "digital_twin_capture_assets",
      sourceId: params.assetId,
    });
  }
}

/**
 * Soft-deletes a published model and queues R2 cleanup for model + preview keys.
 */
export async function softDeleteTwinModel(
  admin: AdminClient,
  params: {
    modelId: string;
    orgId: string;
    deletedBy: string;
  },
): Promise<void> {
  const { data: model, error: loadError } = await admin
    .from("digital_twin_models")
    .select("id, org_id, storage_key, preview_storage_key, file_size_bytes, deleted_at")
    .eq("id", params.modelId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (loadError) throw new Error(loadError.message);
  if (!model) return;

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("digital_twin_models")
    .update({
      deleted_at: now,
      deleted_by: params.deletedBy,
      status: "archived",
    })
    .eq("id", params.modelId);

  if (updateError) throw new Error(updateError.message);

  const keys = [model.storage_key, model.preview_storage_key].filter(Boolean) as string[];
  for (const key of keys) {
    await enqueueTwinR2Cleanup(admin, {
      orgId: params.orgId,
      storageKey: key,
      bytesFreed: key === model.storage_key ? Number(model.file_size_bytes) || 0 : 0,
      sourceTable: "digital_twin_models",
      sourceId: params.modelId,
    });
  }
}
