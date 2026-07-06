import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasRejectedRawExtension,
  isAcceptedMimeType,
  isEquirectAspectRatio,
  RAW_FORMAT_REJECTION_MESSAGE,
  MIME_REJECTION_MESSAGE,
  aspectRejectionMessage,
} from "@/lib/tours/upload-constraints";

export type SceneUploadMeta = {
  filename: string;
  contentType: string;
  size: number;
  width?: number;
  height?: number;
};

export type ValidationResult = { ok: true } | { ok: false; error: string };

/**
 * Same rules the desktop single-shot upload route enforces — extracted so the
 * mobile multipart upload route can't drift from it. Order matters: raw-format
 * rejection must happen before the MIME check (a mislabeled raw file could
 * otherwise slip through if it happens to report a JPEG content-type).
 */
export function validateSceneFileMeta(meta: SceneUploadMeta): ValidationResult {
  if (!meta.filename || !meta.contentType || !meta.size) {
    return { ok: false, error: "Missing required fields" };
  }

  if (hasRejectedRawExtension(meta.filename)) {
    return { ok: false, error: RAW_FORMAT_REJECTION_MESSAGE };
  }

  if (!isAcceptedMimeType(meta.contentType)) {
    return { ok: false, error: MIME_REJECTION_MESSAGE };
  }

  if (meta.width !== undefined && meta.height !== undefined) {
    if (!isEquirectAspectRatio(meta.width, meta.height)) {
      return { ok: false, error: aspectRejectionMessage(meta.width, meta.height) };
    }
  }

  return { ok: true };
}

export type QuotaCheckResult =
  | { ok: true }
  | { ok: false; error: string; currentUsageBytes: number; limitBytes: number; attemptedSizeBytes: number };

export async function checkOrgStorageQuota(
  admin: SupabaseClient,
  orgId: string,
  additionalBytes: number,
): Promise<QuotaCheckResult> {
  const { data: orgData } = await admin
    .from("organizations")
    .select("tier, org_storage_used_bytes")
    .eq("id", orgId)
    .single();

  if (!orgData) return { ok: true };

  const { data: flags } = await admin
    .from("org_feature_flags")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  const { getEntitlements } = await import("@/lib/entitlements");
  const entitlements = getEntitlements(orgData.tier, { featureFlags: flags || {} });

  const maxGB = entitlements?.maxStorageGB || 5;
  const limitBytes = maxGB * 1024 * 1024 * 1024;
  const currentUsageBytes = Number(orgData.org_storage_used_bytes) || 0;
  const newTotalBytes = currentUsageBytes + additionalBytes;

  if (newTotalBytes > limitBytes) {
    return {
      ok: false,
      error: "Storage limit exceeded. Please upgrade your plan.",
      currentUsageBytes,
      limitBytes,
      attemptedSizeBytes: additionalBytes,
    };
  }

  return { ok: true };
}
