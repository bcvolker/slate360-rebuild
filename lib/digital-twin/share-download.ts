import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isBakeFresh, parseBakedExport } from "@/lib/digital-twin/bake-hash";
import { resolveDigitalTwinModelUrl } from "@/lib/digital-twin/resolve-model-url";
import type { TwinShareDenyReason } from "@/lib/digital-twin/share-token";

const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/;

export type TwinShareDownloadResult =
  | {
      ok: true;
      downloadUrl: string;
      filename: string;
      modelFormat: string | null;
    }
  | { ok: false; reason: TwinShareDenyReason | "forbidden" | "unavailable" };

export async function resolveTwinShareDownload(token: string): Promise<TwinShareDownloadResult> {
  if (!TOKEN_RE.test(token)) return { ok: false, reason: "invalid" };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("digital_twin_share_tokens")
    .select("id, role, space_id, download_count, is_revoked, expires_at, max_views, view_count")
    .eq("token", token)
    .maybeSingle();

  if (!row) return { ok: false, reason: "invalid" };
  if (row.is_revoked) return { ok: false, reason: "revoked" };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (
    row.max_views !== null &&
    row.max_views !== undefined &&
    row.view_count >= row.max_views
  ) {
    return { ok: false, reason: "max_views" };
  }
  if (row.role !== "download") return { ok: false, reason: "forbidden" };

  const { data: space } = await admin
    .from("digital_twin_spaces")
    .select("id, title, published_model_id")
    .eq("id", row.space_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!space) return { ok: false, reason: "unavailable" };

  let modelQuery = admin
    .from("digital_twin_models")
    .select("id, title, model_format, storage_key, status, is_primary, edit_list, baked_export")
    .eq("space_id", space.id)
    .eq("status", "ready")
    .is("deleted_at", null);

  if (space.published_model_id) {
    modelQuery = modelQuery.eq("id", space.published_model_id);
  } else {
    modelQuery = modelQuery.eq("is_primary", true);
  }

  const { data: model } = await modelQuery.maybeSingle();
  if (!model?.storage_key) return { ok: false, reason: "unavailable" };

  // E1: clients download what they SEE. The share viewer renders edit_list
  // over the raw file; when a fresh bake of those edits exists, the download
  // is the baked file, so the exported artifact matches the cleaned view.
  const downloadKey = isBakeFresh(model.baked_export, model.edit_list)
    ? parseBakedExport(model.baked_export)!.bakedKey!
    : model.storage_key;
  const downloadUrl = await resolveDigitalTwinModelUrl(downloadKey);
  const ext = model.model_format ?? model.storage_key.split(".").pop() ?? "model";
  const safeTitle = (model.title || space.title || "twin-model").replace(/[^a-zA-Z0-9._\-() ]/g, "_");

  await admin
    .from("digital_twin_share_tokens")
    .update({
      download_count: Number(row.download_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  return {
    ok: true,
    downloadUrl,
    filename: `${safeTitle}.${ext}`,
    modelFormat: model.model_format,
  };
}
