import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type UsageUploadRow = {
  id: string;
  file_size: number | null;
  file_type: string | null;
};

function normalizeFileType(fileType: string | null): string {
  return String(fileType ?? "").trim().toLowerCase();
}

function isModelFile(fileType: string): boolean {
  return ["glb", "obj", "stl", "fbx", "dwg"].includes(fileType)
    || fileType.includes("model/");
}

function isImageFile(fileType: string): boolean {
  return ["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(fileType)
    || fileType.startsWith("image/");
}

export type UsageTruth = {
  storageUsedBytes: number;
  storageUsedGb: number;
  fileCount: number;
  modelsCount: number;
  imageCount: number;
};

export async function resolveUsageTruth(params: {
  userId: string;
  orgId: string | null;
}): Promise<UsageTruth> {
  const admin = createAdminClient();

  let uploadsQuery = admin
    .from("slatedrop_uploads")
    .select("id, file_size, file_type")
    .eq("status", "active");

  uploadsQuery = params.orgId
    ? uploadsQuery.eq("org_id", params.orgId)
    : uploadsQuery.eq("uploaded_by", params.userId);

  const { data, error } = await uploadsQuery;

  if (error) {
    return {
      storageUsedBytes: 0,
      storageUsedGb: 0,
      fileCount: 0,
      modelsCount: 0,
      imageCount: 0,
    };
  }

  const uploads = (data as UsageUploadRow[] | null) ?? [];

  let storageUsedBytes = 0;
  let modelsCount = 0;
  let imageCount = 0;

  for (const upload of uploads) {
    const size = Number(upload.file_size ?? 0);
    if (Number.isFinite(size)) {
      storageUsedBytes += size;
    }

    const fileType = normalizeFileType(upload.file_type);
    if (isModelFile(fileType)) {
      modelsCount += 1;
    }
    if (isImageFile(fileType)) {
      imageCount += 1;
    }
  }

  return {
    storageUsedBytes,
    storageUsedGb: Math.round((storageUsedBytes / (1024 * 1024 * 1024)) * 100) / 100,
    fileCount: uploads.length,
    modelsCount,
    imageCount,
  };
}