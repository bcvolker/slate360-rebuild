import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Increment org_storage_used_bytes after a file upload is marked active.
 * Reads file_size from slatedrop_uploads, then calls increment_org_storage RPC.
 */
export async function trackStorageUsed(
  admin: SupabaseClient,
  orgId: string,
  fileId: string,
): Promise<void> {
  const { data } = await admin
    .from("slatedrop_uploads")
    .select("file_size")
    .eq("id", fileId)
    .single();

  if (!data?.file_size || data.file_size <= 0) return;

  const { error } = await admin.rpc("increment_org_storage", {
    target_org_id: orgId,
    bytes_delta: data.file_size,
  });

  if (error) {
    console.error(`[storage] Failed to track ${data.file_size} bytes for org=${orgId}:`, error.message);
  }
}
