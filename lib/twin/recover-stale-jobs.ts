import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

const DEFAULT_STALE_MINUTES = 45;

/**
 * Marks processing jobs stuck longer than staleMinutes as failed (DB RPC).
 */
export async function recoverStaleDigitalTwinJobs(
  admin: AdminClient,
  staleMinutes = DEFAULT_STALE_MINUTES,
): Promise<number> {
  const { data, error } = await admin.rpc("recover_stale_digital_twin_processing_jobs", {
    p_stale_minutes: staleMinutes,
  });

  if (error) {
    console.error("[twin/recover-stale] RPC failed:", error.message);
    throw new Error(error.message);
  }

  return typeof data === "number" ? data : 0;
}
