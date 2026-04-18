import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

type ProjectFolderRecord = {
  id: string;
  project_id: string | null;
  folder_path: string | null;
};

export type SlateDropUploadRow = {
  id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  s3_key: string;
  org_id: string | null;
  uploaded_by: string;
  status: string;
  folder_id: string | null;
  created_at: string | null;
  unified_file_id?: string | null;
};

type UnifiedFileRow = {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_key: string;
  status: string | null;
};

function inferUnifiedType(fileType: string | null, fileName: string): string {
  const mime = (fileType ?? "").toLowerCase();
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.includes("pdf") || extension === "pdf") return "document";
  return "file";
}

function normalizeUnifiedStatus(uploadStatus: string): string {
  if (uploadStatus === "active") return "ready";
  if (uploadStatus === "deleted") return "archived";
  return "pending";
}

async function loadFolderContext(admin: AdminClient, folderId: string | null): Promise<ProjectFolderRecord | null> {
  if (!folderId) return null;

  const { data, error } = await admin
    .from("project_folders")
    .select("id, project_id, folder_path")
    .eq("id", folderId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function ensureUnifiedFileForUpload(
  admin: AdminClient,
  upload: SlateDropUploadRow,
): Promise<UnifiedFileRow> {
  if (upload.unified_file_id) {
    const { data, error } = await admin
      .from("unified_files")
      .select("id, name, mime_type, size_bytes, storage_key, status")
      .eq("id", upload.unified_file_id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return data;
    }
  }

  const { data: existingRow, error: existingError } = await admin
    .from("unified_files")
    .select("id, name, mime_type, size_bytes, storage_key, status")
    .eq("source", "slatedrop")
    .eq("storage_key", upload.s3_key)
    .eq("uploaded_by", upload.uploaded_by)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingRow) {
    const { error: updateError } = await admin
      .from("slatedrop_uploads")
      .update({ unified_file_id: existingRow.id })
      .eq("id", upload.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return existingRow;
  }

  const folderContext = await loadFolderContext(admin, upload.folder_id);
  const metadata = {
    visibility: "private",
    slatedropUploadId: upload.id,
  };

  const { data: insertedRow, error: insertError } = await admin
    .from("unified_files")
    .insert({
      project_id: folderContext?.project_id ?? null,
      org_id: upload.org_id,
      name: upload.file_name,
      original_name: upload.file_name,
      type: inferUnifiedType(upload.file_type, upload.file_name),
      mime_type: upload.file_type,
      size_bytes: upload.file_size ?? 0,
      storage_key: upload.s3_key,
      source: "slatedrop",
      folder_id: upload.folder_id,
      folder_path: folderContext?.folder_path ?? null,
      status: normalizeUnifiedStatus(upload.status),
      uploaded_by: upload.uploaded_by,
      uploaded_at: upload.created_at,
      metadata,
      file_type: upload.file_type,
    })
    .select("id, name, mime_type, size_bytes, storage_key, status")
    .single();

  if (insertError || !insertedRow) {
    throw new Error(insertError?.message ?? "Failed to create unified file row");
  }

  const { error: linkError } = await admin
    .from("slatedrop_uploads")
    .update({ unified_file_id: insertedRow.id })
    .eq("id", upload.id);

  if (linkError) {
    throw new Error(linkError.message);
  }

  return insertedRow;
}