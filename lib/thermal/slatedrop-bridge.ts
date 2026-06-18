import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";
import { resolveProjectFolderIdByName } from "@/lib/slatedrop/folder-resolver";
import { trackStorageUsed } from "@/lib/slatedrop/track-storage";

/**
 * Registers a thermal DELIVERABLE (report PDF/HTML, export) into SlateDrop as a
 * `slatedrop_uploads` row pointing at the EXISTING thermal R2 key. We never copy
 * the heavy radiometric bytes — raw/NPZ stay under orgs/{org}/thermal/... and only
 * finished artifacts are indexed under the linked project's Reports folder.
 */
type BridgeDeliverableParams = {
  storageKey: string;
  fileName: string;
  fileType: string;
  projectId: string;
  orgId: string;
  userId: string | null;
};

async function objectSize(key: string): Promise<number> {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return head.ContentLength ?? 0;
  } catch {
    return 0;
  }
}

export async function bridgeThermalDeliverableToSlateDrop(
  admin: SupabaseClient,
  params: BridgeDeliverableParams,
): Promise<string | null> {
  try {
    const folderId = await resolveProjectFolderIdByName(
      params.projectId,
      "Reports",
      params.orgId,
      params.userId ?? "",
    );
    if (!folderId) {
      console.warn(`[thermal-slatedrop-bridge] No Reports folder for project ${params.projectId}`);
      return null;
    }

    // Don't double-register the same artifact.
    const { data: existing } = await admin
      .from("slatedrop_uploads")
      .select("id")
      .eq("s3_key", params.storageKey)
      .eq("org_id", params.orgId)
      .maybeSingle();
    if (existing?.id) return existing.id;

    const { data: upload, error } = await admin
      .from("slatedrop_uploads")
      .insert({
        file_name: params.fileName,
        file_size: await objectSize(params.storageKey),
        file_type: params.fileType,
        s3_key: params.storageKey,
        folder_id: folderId,
        org_id: params.orgId,
        uploaded_by: params.userId,
        status: "active",
      })
      .select("id")
      .single();

    if (error || !upload) {
      console.error("[thermal-slatedrop-bridge] insert failed:", error?.message);
      return null;
    }

    await trackStorageUsed(admin, params.orgId, upload.id);
    return upload.id;
  } catch (err) {
    console.error("[thermal-slatedrop-bridge] unexpected error:", err);
    return null;
  }
}

/**
 * Registers a finished report's PDF + HTML into SlateDrop, but only if the session
 * is linked to a project. Best-effort and self-contained (looks up the project).
 */
export async function bridgeThermalReportDeliverables(
  admin: SupabaseClient,
  job: { session_id: string; org_id: string | null; created_by: string | null },
  report: { title?: string | null; pdfKey?: string | null; htmlKey?: string | null },
): Promise<void> {
  if (!job.org_id) return;

  const { data: session } = await admin
    .from("thermal_analysis_sessions")
    .select("project_id")
    .eq("id", job.session_id)
    .maybeSingle();
  const projectId = (session?.project_id as string | null) ?? null;
  if (!projectId) return;

  const base = (report.title ?? "thermal_report").replace(/[^a-zA-Z0-9._-]+/g, "_");
  const targets: Array<{ key: string; ext: string }> = [];
  if (report.pdfKey) targets.push({ key: report.pdfKey, ext: "pdf" });
  if (report.htmlKey) targets.push({ key: report.htmlKey, ext: "html" });

  for (const target of targets) {
    await bridgeThermalDeliverableToSlateDrop(admin, {
      storageKey: target.key,
      fileName: `${base}.${target.ext}`,
      fileType: target.ext,
      projectId,
      orgId: job.org_id,
      userId: job.created_by,
    });
  }
}
