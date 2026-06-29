import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCanonicalAssetFilename,
  extensionFromFilename,
  extensionFromMime,
} from "@/lib/slatedrop/canonical-filename";
import {
  inferTwinAssetFolder,
  twinAssetFolderPath,
} from "@/lib/slatedrop/folder-taxonomy";
import { registerTwinDeliverableInSlateDrop } from "@/lib/twin/register-twin-deliverable";
import { trackStorageUsed } from "@/lib/slatedrop/track-storage";
import { resolveTwinProjectFolder } from "@/lib/site-walk/slatedrop-folders";

type BridgeTwinAssetParams = {
  assetId: string;
  storageKey: string;
  fileName: string;
  contentType: string | null;
  fileSize: number;
  assetKind: string;
  projectId: string;
  orgId: string;
  userId: string;
};

function twinAssetTypeForFolder(
  folder: ReturnType<typeof inferTwinAssetFolder>,
): "Clip" | "Model" | "SourceAsset" {
  if (folder === "Clips") return "Clip";
  if (folder === "Models") return "Model";
  return "SourceAsset";
}

export async function bridgeTwinAssetToSlateDrop(
  admin: SupabaseClient,
  params: BridgeTwinAssetParams,
): Promise<string | null> {
  try {
    const subfolder = inferTwinAssetFolder(params.assetKind, params.fileName);
    const folderId = await resolveTwinProjectFolder(
      admin,
      params.projectId,
      params.orgId,
      params.userId,
      twinAssetFolderPath(subfolder),
    );

    if (!folderId) {
      console.warn(
        `[twin-slatedrop-bridge] No 03_Digital_Twin/${subfolder} for project ${params.projectId}`,
      );
      return null;
    }

    const ext =
      extensionFromFilename(params.fileName) ||
      extensionFromMime(params.contentType ?? "", "bin");

    const canonicalName = buildCanonicalAssetFilename({
      type: twinAssetTypeForFolder(subfolder),
      id: params.assetId,
      ext,
    });

    const { data: existing } = await admin
      .from("slatedrop_uploads")
      .select("id")
      .eq("s3_key", params.storageKey)
      .eq("org_id", params.orgId)
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data: upload, error: insertErr } = await admin
      .from("slatedrop_uploads")
      .insert({
        file_name: canonicalName,
        file_size: params.fileSize,
        file_type: ext,
        s3_key: params.storageKey,
        folder_id: folderId,
        org_id: params.orgId,
        uploaded_by: params.userId,
        status: "active",
      })
      .select("id")
      .single();

    if (insertErr || !upload) {
      console.error("[twin-slatedrop-bridge] insert failed:", insertErr?.message);
      return null;
    }

    await trackStorageUsed(admin, params.orgId, upload.id);
    return upload.id;
  } catch (err) {
    console.error("[twin-slatedrop-bridge] unexpected error:", err);
    return null;
  }
}

type BridgeTwinModelParams = {
  modelId: string;
  storageKey: string;
  modelFormat: string;
  fileSize: number;
  projectId: string;
  orgId: string;
  userId: string;
};

export async function bridgeTwinModelToSlateDrop(
  admin: SupabaseClient,
  params: BridgeTwinModelParams,
): Promise<string | null> {
  return bridgeTwinAssetToSlateDrop(admin, {
    assetId: params.modelId,
    storageKey: params.storageKey,
    fileName: `model.${params.modelFormat}`,
    contentType: "application/octet-stream",
    fileSize: params.fileSize,
    assetKind: "model",
    projectId: params.projectId,
    orgId: params.orgId,
    userId: params.userId,
  });
}

/**
 * Both SlateDrop side-effects of a completed twin job, in one call: bridge the raw
 * model file into `03_Digital_Twin/Models`, and (for the primary model only) register
 * the presentable twin as a deliverable link in `03_Digital_Twin/Deliverables`. Both
 * are non-fatal. Keeps the completion seam (`job-callback`) flat.
 */
export async function bridgeTwinCompletionToSlateDrop(
  admin: SupabaseClient,
  params: BridgeTwinModelParams & { spaceId: string; title: string; isPrimary: boolean },
): Promise<void> {
  await bridgeTwinModelToSlateDrop(admin, params);
  if (params.isPrimary) {
    await registerTwinDeliverableInSlateDrop({
      admin,
      projectId: params.projectId,
      orgId: params.orgId,
      userId: params.userId,
      spaceId: params.spaceId,
      title: params.title,
    });
  }
}
