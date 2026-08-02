import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { TwinShareDenyReason } from "@/lib/digital-twin/share-token";

const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/;

export type TwinShareModelRow = {
  id: string;
  storage_key: string;
  file_size_bytes: number | null;
  model_format: string | null;
  capture_id: string | null;
  quality_metrics: Record<string, unknown> | null;
  org_id: string;
  space_id: string;
};

export type TwinShareModelResult =
  | { ok: true; model: TwinShareModelRow }
  | { ok: false; reason: TwinShareDenyReason | "unavailable" };

/** Resolve the published/primary model for a share token (any format). */
export async function resolveTwinShareModel(token: string): Promise<TwinShareModelResult> {
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
    .select("id, published_model_id, org_id")
    .eq("id", row.space_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!space) return { ok: false, reason: "unavailable" };

  let modelQuery = admin
    .from("digital_twin_models")
    .select(
      "id, storage_key, file_size_bytes, status, is_primary, model_format, capture_id, quality_metrics, org_id, space_id",
    )
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

  return {
    ok: true,
    model: {
      id: model.id,
      storage_key: model.storage_key,
      file_size_bytes: model.file_size_bytes ?? null,
      model_format: model.model_format ?? null,
      capture_id: model.capture_id ?? null,
      quality_metrics: (model.quality_metrics as Record<string, unknown> | null) ?? null,
      org_id: model.org_id,
      space_id: model.space_id,
    },
  };
}
