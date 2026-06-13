/**
 * Site Walk → SlateDrop Bridge
 *
 * Creates slatedrop_uploads records for Site Walk captures so they
 * appear in the project's numbered SlateDrop folder tree.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCanonicalAssetFilename,
  extensionFromFilename,
} from "@/lib/slatedrop/canonical-filename";
import { trackStorageUsed } from "@/lib/slatedrop/track-storage";
import type { SiteWalkCaptureFolder } from "@/lib/slatedrop/folder-taxonomy";
import { ensureSiteWalkProjectFolder } from "@/lib/site-walk/slatedrop-folders";

type BridgeFileCaptureParams = {
  itemId: string;
  s3Key: string;
  fileName?: string;
  fileType: string;
  fileSize: number;
  projectId: string;
  orgId: string;
  userId: string;
  folder: SiteWalkCaptureFolder;
  assetType: "Photo" | "Note" | "VoiceMemo" | "File";
};

async function bridgeFileCaptureToSlateDrop(
  admin: SupabaseClient,
  params: BridgeFileCaptureParams,
): Promise<string | null> {
  try {
    const folderId = await ensureSiteWalkProjectFolder({
      admin,
      projectId: params.projectId,
      orgId: params.orgId,
      userId: params.userId,
      childName: params.folder,
    });

    if (!folderId) {
      console.warn(
        `[slatedrop-bridge] No "${params.folder}" folder for project ${params.projectId}. ` +
          "SlateDrop record skipped — run /api/slatedrop/provision first.",
      );
      return null;
    }

    const ext = params.fileType || extensionFromFilename(params.fileName ?? params.s3Key);
    const canonicalName =
      params.fileName && /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}_/.test(params.fileName)
        ? params.fileName
        : buildCanonicalAssetFilename({
            type: params.assetType,
            id: params.itemId,
            ext,
          });

    const { data: upload, error: insertErr } = await admin
      .from("slatedrop_uploads")
      .insert({
        file_name: canonicalName,
        file_size: params.fileSize,
        file_type: ext,
        s3_key: params.s3Key,
        folder_id: folderId,
        org_id: params.orgId,
        uploaded_by: params.userId,
        status: "active",
      })
      .select("id")
      .single();

    if (insertErr || !upload) {
      console.error("[slatedrop-bridge] insert failed:", insertErr?.message);
      return null;
    }

    const { error: linkErr } = await admin
      .from("site_walk_items")
      .update({ file_id: upload.id })
      .eq("id", params.itemId);

    if (linkErr) {
      console.error("[slatedrop-bridge] link failed:", linkErr.message);
    }

    await trackStorageUsed(admin, params.orgId, upload.id);

    return upload.id;
  } catch (err) {
    console.error("[slatedrop-bridge] unexpected error:", err);
    return null;
  }
}

type BridgePhotoCaptureParams = {
  itemId: string;
  s3Key: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  projectId: string;
  orgId: string;
  userId: string;
};

export async function bridgePhotoToSlateDrop(
  admin: SupabaseClient,
  params: BridgePhotoCaptureParams,
): Promise<string | null> {
  return bridgeFileCaptureToSlateDrop(admin, {
    ...params,
    folder: "Photos",
    assetType: "Photo",
  });
}

export async function bridgeVoiceMemoToSlateDrop(
  admin: SupabaseClient,
  params: BridgePhotoCaptureParams,
): Promise<string | null> {
  return bridgeFileCaptureToSlateDrop(admin, {
    ...params,
    folder: "Voice_Memos",
    assetType: "VoiceMemo",
  });
}

type BridgePdfExportParams = {
  deliverableId: string;
  s3Key: string;
  fileName: string;
  fileSize: number;
  projectId: string;
  orgId: string;
  userId: string;
};

export async function bridgePdfToSlateDrop(
  admin: SupabaseClient,
  params: BridgePdfExportParams,
): Promise<string | null> {
  try {
    const folderId = await ensureSiteWalkProjectFolder({
      admin,
      projectId: params.projectId,
      orgId: params.orgId,
      userId: params.userId,
      childName: "Deliverables",
    });

    if (!folderId) {
      console.warn(
        `[slatedrop-bridge] No Deliverables folder for project ${params.projectId}. ` +
          "PDF SlateDrop record skipped.",
      );
      return null;
    }

    const canonicalName = buildCanonicalAssetFilename({
      type: "Deliverable",
      id: params.deliverableId,
      ext: "pdf",
    });

    const { data: upload, error: insertErr } = await admin
      .from("slatedrop_uploads")
      .insert({
        file_name: canonicalName,
        file_size: params.fileSize,
        file_type: "pdf",
        s3_key: params.s3Key,
        folder_id: folderId,
        org_id: params.orgId,
        uploaded_by: params.userId,
        status: "active",
      })
      .select("id")
      .single();

    if (insertErr || !upload) {
      console.error("[slatedrop-bridge] PDF insert failed:", insertErr?.message);
      return null;
    }

    await trackStorageUsed(admin, params.orgId, upload.id);

    return upload.id;
  } catch (err) {
    console.error("[slatedrop-bridge] PDF bridge unexpected error:", err);
    return null;
  }
}
