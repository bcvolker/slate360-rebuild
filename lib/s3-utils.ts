import { DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "./s3";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Physically deletes a single object from S3.
 */
export async function deleteS3Object(key: string): Promise<boolean> {
  if (!key) return true;
  
  try {
    const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
    await s3.send(command);
    console.log(`[S3] Deleted object: ${key}`);
    return true;
  } catch (err) {
    console.error(`[S3] Failed to delete ${key}:`, err);
    return false;
  }
}

/**
 * Physically deletes multiple objects from S3 in a single batch.
 */
export async function deleteS3Objects(keys: string[]): Promise<boolean> {
  if (!keys || keys.length === 0) return true;
  
  try {
    const command = new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: { Objects: keys.map((key) => ({ Key: key })), Quiet: true },
    });
    await s3.send(command);
    console.log(`[S3] Deleted ${keys.length} objects.`);
    return true;
  } catch (err) {
    console.error(`[S3] Failed to batch delete objects:`, err);
    return false;
  }
}

/**
 * Recovers quota for an organization by calling the increment_org_storage RPC.
 * Call this with a negative number when deleting files.
 */
export async function recoverOrgStorage(orgId: string, bytesFreed: number): Promise<void> {
  if (!orgId || bytesFreed <= 0) return;

  const admin = createAdminClient();
  const bytesDelta = -Math.abs(bytesFreed);

  const { error } = await admin.rpc("increment_org_storage", {
    target_org_id: orgId,
    bytes_delta: bytesDelta,
  });

  if (error) {
    console.error(`[S3 Quota] Failed to recover ${bytesFreed} bytes for org ${orgId}:`, error.message);
  } else {
    console.log(`[S3 Quota] Recovered ${bytesFreed} bytes for org ${orgId}`);
  }
}
