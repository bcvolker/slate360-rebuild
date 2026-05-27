import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteS3Object, recoverOrgStorage } from "@/lib/s3-utils";

type AdminClient = SupabaseClient;

const MAX_ATTEMPTS = 5;

export type TwinR2CleanupRow = {
  id: string;
  org_id: string;
  storage_key: string;
  bytes_freed: number;
  source_table: string;
  source_id: string | null;
  attempts: number;
};

/**
 * Queues deferred R2 deletion after soft-delete (DB RPC).
 */
export async function enqueueTwinR2Cleanup(
  admin: AdminClient,
  params: {
    orgId: string;
    storageKey: string;
    bytesFreed?: number;
    sourceTable?: string;
    sourceId?: string | null;
  },
): Promise<string | null> {
  const { data, error } = await admin.rpc("enqueue_digital_twin_r2_cleanup", {
    p_org_id: params.orgId,
    p_storage_key: params.storageKey,
    p_bytes_freed: params.bytesFreed ?? 0,
    p_source_table: params.sourceTable ?? "digital_twin_capture_assets",
    p_source_id: params.sourceId ?? null,
  });

  if (error) {
    console.error(
      `[twin/r2-cleanup] enqueue failed org=${params.orgId} key=${params.storageKey}:`,
      error.message,
    );
    return null;
  }

  return typeof data === "string" ? data : null;
}

/**
 * Processes pending rows from digital_twin_r2_cleanup_queue (best-effort batch).
 */
export async function processTwinR2CleanupBatch(
  admin: AdminClient,
  limit = 25,
): Promise<{ processed: number; failed: number }> {
  const { data: rows, error } = await admin
    .from("digital_twin_r2_cleanup_queue")
    .select("id, org_id, storage_key, bytes_freed, source_table, source_id, attempts")
    .eq("status", "pending")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !rows?.length) {
    if (error) {
      console.error("[twin/r2-cleanup] batch load:", error.message);
    }
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const row of rows as TwinR2CleanupRow[]) {
    await admin
      .from("digital_twin_r2_cleanup_queue")
      .update({ status: "processing", attempts: row.attempts + 1 })
      .eq("id", row.id);

    try {
      await deleteS3Object(row.storage_key);
      if (row.bytes_freed > 0) {
        await recoverOrgStorage(row.org_id, row.bytes_freed);
      }

      await admin
        .from("digital_twin_r2_cleanup_queue")
        .update({
          status: "completed",
          processed_at: new Date().toISOString(),
          error_text: null,
        })
        .eq("id", row.id);

      processed += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed += 1;
      await admin
        .from("digital_twin_r2_cleanup_queue")
        .update({
          status: row.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending",
          error_text: msg,
        })
        .eq("id", row.id);
      console.error(`[twin/r2-cleanup] delete failed id=${row.id}:`, msg);
    }
  }

  return { processed, failed };
}
