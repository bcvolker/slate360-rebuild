import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

export type DraftShellCleanupResult = {
  spacesArchived: number;
  capturesFailed: number;
};

/**
 * Abandoned shells never show up as twins (design rule §4: "rows without a
 * capture and without a model are deleted by the server after 24 h").
 *
 * 1. Draft/capturing spaces older than `olderThanHours` with no capture rows at
 *    all and no processing job are soft-deleted (archived).
 * 2. Captures still `uploading` after `olderThanHours` with zero ready assets
 *    are marked failed with a plain reason, so their twin shows Failed rather
 *    than an eternal Uploading.
 *
 * Both are idempotent and cheap; the cron calls this every 15 minutes.
 */
export async function cleanupTwinDraftShells(
  admin: AdminClient,
  olderThanHours = 24,
  now: Date = new Date(),
): Promise<DraftShellCleanupResult> {
  const cutoff = new Date(now.getTime() - olderThanHours * 3600_000).toISOString();
  const result: DraftShellCleanupResult = { spacesArchived: 0, capturesFailed: 0 };

  const { data: spaces, error: spacesError } = await admin
    .from("digital_twin_spaces")
    .select("id")
    .in("status", ["draft", "capturing"])
    .is("deleted_at", null)
    .lt("created_at", cutoff)
    .limit(200);
  if (spacesError) throw new Error(spacesError.message);

  const candidateIds = (spaces ?? []).map((s) => s.id as string);
  if (candidateIds.length > 0) {
    const [{ data: captures }, { data: jobs }] = await Promise.all([
      admin.from("digital_twin_captures").select("space_id").in("space_id", candidateIds),
      admin.from("digital_twin_processing_jobs").select("space_id").in("space_id", candidateIds),
    ]);
    const busy = new Set<string>();
    for (const row of captures ?? []) if (row.space_id) busy.add(row.space_id as string);
    for (const row of jobs ?? []) if (row.space_id) busy.add(row.space_id as string);
    const empty = candidateIds.filter((id) => !busy.has(id));
    if (empty.length > 0) {
      const { error } = await admin
        .from("digital_twin_spaces")
        .update({ deleted_at: now.toISOString(), status: "archived" })
        .in("id", empty)
        .is("deleted_at", null);
      if (error) throw new Error(error.message);
      result.spacesArchived = empty.length;
    }
  }

  const { data: stuck, error: stuckError } = await admin
    .from("digital_twin_captures")
    .select("id")
    .eq("capture_status", "uploading")
    .is("deleted_at", null)
    .lt("created_at", cutoff)
    .limit(200);
  if (stuckError) throw new Error(stuckError.message);
  const stuckIds = (stuck ?? []).map((c) => c.id as string);
  if (stuckIds.length > 0) {
    const { data: readyAssets } = await admin
      .from("digital_twin_capture_assets")
      .select("capture_id")
      .in("capture_id", stuckIds)
      .eq("status", "ready")
      .is("deleted_at", null);
    const hasBytes = new Set((readyAssets ?? []).map((a) => a.capture_id as string));
    const dead = stuckIds.filter((id) => !hasBytes.has(id));
    if (dead.length > 0) {
      const { error } = await admin
        .from("digital_twin_captures")
        .update({
          capture_status: "failed",
          error_text: "Upload never finished — nothing reached the cloud. Scan again.",
        })
        .in("id", dead);
      if (error) throw new Error(error.message);
      result.capturesFailed = dead.length;
    }
  }

  return result;
}
