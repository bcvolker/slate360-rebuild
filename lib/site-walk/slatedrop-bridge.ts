/**
 * Site Walk → SlateDrop Bridge
 *
 * Creates slatedrop_uploads records for Site Walk captures so they
 * appear in the project's SlateDrop folder structure.
 *
 * MUST be awaited — callers should `await bridgePhotoToSlateDrop()`
 * to guarantee DB writes complete before the serverless function
 * exits. Bridge failures return null and are logged; they do not
 * throw and should never prevent the item response.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveProjectFolderIdByName } from "@/lib/slatedrop/projectArtifacts";
import { trackStorageUsed } from "@/lib/slatedrop/track-storage";

type BridgePhotoCaptureParams = {
  /** The newly-created site_walk_items row id */
  itemId: string;
  /** S3 object key from the upload */
  s3Key: string;
  /** Original filename, e.g. "photo-1713100000000.jpg" */
  fileName: string;
  /** File extension without dot, e.g. "jpg" */
  fileType: string;
  /** Byte size of the upload (0 if unknown) */
  fileSize: number;
  /** Project that owns this session */
  projectId: string;
  orgId: string;
  userId: string;
};

/**
 * Bridge a Site Walk photo capture to SlateDrop.
 *
 * 1. Resolves the project's "Photos" folder in project_folders.
 * 2. Inserts an `slatedrop_uploads` record (status: active).
 * 3. Links it back to `site_walk_items.file_id`.
 * 4. Tracks storage usage against the org quota.
 *
 * Returns the slatedrop_uploads id, or null on failure.
 */
export async function bridgePhotoToSlateDrop(
  admin: SupabaseClient,
  params: BridgePhotoCaptureParams,
): Promise<string | null> {
  try {
    // 1. Resolve project Photos folder
    const folderId = await resolveProjectFolderIdByName(
      params.projectId,
      "Photos",
      params.orgId,
      params.userId,
    );

    if (!folderId) {
      console.warn(
        `[slatedrop-bridge] No "Photos" folder for project ${params.projectId}. ` +
          "SlateDrop record skipped — run /api/slatedrop/provision first.",
      );
      return null;
    }

    // 2. Create slatedrop_uploads record
    const { data: upload, error: insertErr } = await admin
      .from("slatedrop_uploads")
      .insert({
        file_name: params.fileName,
        file_size: params.fileSize,
        file_type: params.fileType,
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

    // 3. Link site_walk_items.file_id → slatedrop_uploads.id
    const { error: linkErr } = await admin
      .from("site_walk_items")
      .update({ file_id: upload.id })
      .eq("id", params.itemId);

    if (linkErr) {
      console.error("[slatedrop-bridge] link failed:", linkErr.message);
    }

    // 4. Track storage (non-fatal)
    await trackStorageUsed(admin, params.orgId, upload.id);

    return upload.id;
  } catch (err) {
    console.error("[slatedrop-bridge] unexpected error:", err);
    return null;
  }
}

// ── PDF Export Bridge ────────────────────────────────────────────

type BridgePdfExportParams = {
  /** The deliverable id that generated the PDF */
  deliverableId: string;
  /** S3 key where the PDF was uploaded */
  s3Key: string;
  /** Display filename, e.g. "Site Report 2026-04-14.pdf" */
  fileName: string;
  /** Byte size of the PDF buffer */
  fileSize: number;
  /** Project that owns the session/deliverable */
  projectId: string;
  orgId: string;
  userId: string;
};

/**
 * Bridge a Site Walk deliverable PDF export to SlateDrop.
 *
 * 1. Resolves the project's "Deliverables" folder in project_folders.
 * 2. Inserts a `slatedrop_uploads` record (status: active).
 * 3. Tracks storage usage against the org quota.
 *
 * Returns the slatedrop_uploads id, or null on failure.
 */
export async function bridgePdfToSlateDrop(
  admin: SupabaseClient,
  params: BridgePdfExportParams,
): Promise<string | null> {
  try {
    const folderId = await resolveProjectFolderIdByName(
      params.projectId,
      "Deliverables",
      params.orgId,
      params.userId,
    );

    if (!folderId) {
      console.warn(
        `[slatedrop-bridge] No "Deliverables" folder for project ${params.projectId}. ` +
          "PDF SlateDrop record skipped — run /api/slatedrop/provision first.",
      );
      return null;
    }

    const { data: upload, error: insertErr } = await admin
      .from("slatedrop_uploads")
      .insert({
        file_name: params.fileName,
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
