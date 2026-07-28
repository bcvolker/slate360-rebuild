import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * P0a — idempotent capture-asset registration.
 *
 * Before this, every presign/init call inserted a new `digital_twin_capture_assets` row. Any
 * retry, page refresh, or re-entry into the submit flow therefore re-registered the same
 * source file: the 2026-07-08 field test produced three rows for one 262.9 MB video (two
 * `ready`, one stuck `uploading` with a NULL storage_key), the job ran against the incomplete
 * set, and the upload took 25+ minutes because the bytes went up three times.
 *
 * When the client supplies a `clientFingerprint` we reuse the existing live row for that
 * (capture, fingerprint) instead of inserting. Callers without a fingerprint keep the previous
 * insert-always behaviour, so nothing regresses for older clients.
 */

export type UpsertTwinAssetInput = {
  orgId: string;
  spaceId: string;
  captureId: string;
  assetKind: string;
  contentType: string;
  sizeBytes: number;
  sortOrder: number;
  clientFingerprint: string | null;
};

export async function upsertTwinCaptureAsset(
  admin: SupabaseClient,
  input: UpsertTwinAssetInput,
): Promise<{ id: string; reused: boolean }> {
  if (input.clientFingerprint) {
    const { data: existing } = await admin
      .from("digital_twin_capture_assets")
      .select("id, status, storage_key")
      .eq("capture_id", input.captureId)
      .eq("client_fingerprint", input.clientFingerprint)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing?.id) {
      // A finished upload must NOT be walked backwards. Re-entering the submit flow and
      // re-picking a file that already uploaded is the exact scenario this dedup exists for,
      // and blindly resetting status to "uploading" would regress a good `ready` row — then
      // if the user closed the tab it would sit there until the stale sweep soft-deleted a
      // perfectly good asset. If the bytes are already up, hand the row back untouched.
      if (existing.status === "ready" && existing.storage_key) {
        return { id: existing.id, reused: true };
      }

      // Otherwise the previous attempt genuinely never finished. Re-presigning is legitimate
      // (the old URL may have expired), so refresh the mutable fields and reuse the row rather
      // than creating a sibling.
      await admin
        .from("digital_twin_capture_assets")
        .update({
          asset_kind: input.assetKind,
          content_type: input.contentType,
          file_size_bytes: input.sizeBytes,
          status: "uploading",
        })
        .eq("id", existing.id);
      return { id: existing.id, reused: true };
    }
  }

  const { data: asset, error } = await admin
    .from("digital_twin_capture_assets")
    .insert({
      org_id: input.orgId,
      space_id: input.spaceId,
      capture_id: input.captureId,
      asset_kind: input.assetKind,
      upload_tier: "standard",
      content_type: input.contentType,
      file_size_bytes: input.sizeBytes,
      status: "uploading",
      sort_order: input.sortOrder,
      client_fingerprint: input.clientFingerprint,
    })
    .select("id")
    .single();

  if (error || !asset?.id) {
    throw new Error(error?.message ?? "Failed to create capture asset");
  }
  return { id: asset.id, reused: false };
}
