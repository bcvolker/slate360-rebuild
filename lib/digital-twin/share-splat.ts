import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { TwinShareDenyReason } from "@/lib/digital-twin/share-token";

const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/;

export type TwinShareSplatResult =
  | { ok: true; storageKey: string; fileSizeBytes: number | null }
  | { ok: false; reason: TwinShareDenyReason | "unavailable" };

export async function resolveTwinShareSplat(token: string): Promise<TwinShareSplatResult> {
  if (!TOKEN_RE.test(token)) return { ok: false, reason: "invalid" };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("digital_twin_share_tokens")
    .select("id, space_id, is_revoked, expires_at, max_views, view_count")
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

  const { data: space } = await admin
    .from("digital_twin_spaces")
    .select("id, published_model_id")
    .eq("id", row.space_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!space) return { ok: false, reason: "unavailable" };

  let modelQuery = admin
    .from("digital_twin_models")
    .select("id, storage_key, file_size_bytes, status, is_primary, model_format")
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

  const ext = model.storage_key.split(/[?#]/)[0]?.split(".").pop()?.toLowerCase() ?? "";
  if (model.model_format !== "spz" && ext !== "spz") {
    return { ok: false, reason: "unavailable" };
  }

  return {
    ok: true,
    storageKey: model.storage_key,
    fileSizeBytes: model.file_size_bytes ?? null,
  };
}
