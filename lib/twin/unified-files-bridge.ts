import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

export type TwinAssetBridgeInput = {
  orgId: string;
  projectId: string;
  spaceId: string;
  captureId: string;
  assetId: string;
  fileName: string;
  contentType: string | null;
  sizeBytes: number;
  storageKey: string;
  uploadedBy: string;
};

function inferUnifiedType(contentType: string | null, fileName: string): string {
  const mime = (contentType ?? "").toLowerCase();
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.includes("pdf") || extension === "pdf") return "document";
  return "file";
}

/**
 * Creates a unified_files row with source:"digital_twin" and links it on the capture asset.
 */
export async function createUnifiedFileForTwinAsset(
  admin: AdminClient,
  input: TwinAssetBridgeInput,
): Promise<string> {
  const { data: asset, error: assetError } = await admin
    .from("digital_twin_capture_assets")
    .select("id, unified_file_id")
    .eq("id", input.assetId)
    .eq("org_id", input.orgId)
    .maybeSingle();

  if (assetError) throw new Error(assetError.message);
  if (!asset) throw new Error("Capture asset not found");

  if (asset.unified_file_id) return asset.unified_file_id;

  const metadata = {
    visibility: "private",
    digitalTwinSpaceId: input.spaceId,
    digitalTwinCaptureId: input.captureId,
    digitalTwinAssetId: input.assetId,
  };

  const { data: inserted, error: insertError } = await admin
    .from("unified_files")
    .insert({
      project_id: input.projectId,
      org_id: input.orgId,
      name: input.fileName,
      original_name: input.fileName,
      type: inferUnifiedType(input.contentType, input.fileName),
      mime_type: input.contentType,
      size_bytes: input.sizeBytes,
      storage_key: input.storageKey,
      source: "digital_twin",
      status: "pending",
      uploaded_by: input.uploadedBy,
      uploaded_at: new Date().toISOString(),
      metadata,
      file_type: input.contentType,
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    throw new Error(insertError?.message ?? "Failed to create unified file row");
  }

  const { error: linkError } = await admin
    .from("digital_twin_capture_assets")
    .update({ unified_file_id: inserted.id })
    .eq("id", input.assetId);

  if (linkError) throw new Error(linkError.message);

  return inserted.id;
}

export async function markUnifiedFileReady(
  admin: AdminClient,
  unifiedFileId: string,
  storageKey: string,
  sizeBytes: number,
): Promise<void> {
  const { error } = await admin
    .from("unified_files")
    .update({
      storage_key: storageKey,
      size_bytes: sizeBytes,
      status: "ready",
    })
    .eq("id", unifiedFileId);

  if (error) throw new Error(error.message);
}
