import "server-only";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { tasks } from "@trigger.dev/sdk/v3";
import { BUCKET, s3 } from "@/lib/s3";
import { buildCanonicalS3Key, resolveNamespace } from "@/lib/slatedrop/storage";
import { isPlanUploadFolder, rejectPlanFile } from "./assemble-plans";

const triggerRequestOptions = { clientConfig: { previewBranch: "" } };

type Row = Record<string, unknown>;

type Admin = {
  from: (table: string) => any;
};

export type PlanUploadRejection = { status: 400 | 403 | 404 | 409; error: string };

export async function reserveProjectPlanUpload(
  admin: Admin,
  args: { projectId: string; orgId: string; userId: string; filename: string; size: number; pageCount: number },
): Promise<{ uploadUrl: string; fileId: string } | PlanUploadRejection> {
  const rejected = rejectPlanFile(args.filename, args.size, args.pageCount);
  if (rejected) return rejected;
  const folder = await findPlanFolder(admin, args.projectId);
  if (!folder) return { status: 409, error: "This project has no drawings folder yet." };

  const s3Key = buildCanonicalS3Key(resolveNamespace(args.orgId, args.userId), folder.id, args.filename);
  let uploadUrl: string;
  try {
    uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        ContentType: "application/pdf",
        ContentLength: args.size,
      }),
      { expiresIn: 900 },
    );
  } catch {
    return { status: 400, error: "The plan could not be prepared for upload." };
  }

  const inserted = await admin
    .from("slatedrop_uploads")
    .insert({
      file_name: args.filename,
      file_size: args.size,
      file_type: "pdf",
      s3_key: s3Key,
      org_id: args.orgId,
      project_id: args.projectId,
      folder_id: folder.id,
      uploaded_by: args.userId,
      status: "pending",
    })
    .select("id")
    .single();
  const id = (inserted.data as { id?: string } | null)?.id;
  if (inserted.error || !id) return { status: 400, error: "The plan could not be saved." };
  return { uploadUrl, fileId: id };
}

export async function commitProjectPlanUpload(
  admin: Admin,
  args: { projectId: string; orgId: string; userId: string; fileId: string; pageCount: number },
): Promise<{ planSetId: string; status: string } | PlanUploadRejection> {
  if (!Number.isInteger(args.pageCount) || args.pageCount < 1 || args.pageCount > 250) {
    return { status: 400, error: "A plan set must be between 1 and 250 sheets." };
  }
  const folder = await findPlanFolder(admin, args.projectId);
  if (!folder) return { status: 409, error: "This project has no drawings folder yet." };

  const fileResult = await admin
    .from("slatedrop_uploads")
    .select("id, file_name, file_size, s3_key, folder_id, project_id, status, org_id")
    .eq("id", args.fileId)
    .maybeSingle();
  const file = fileResult.data as Row | null;
  if (fileResult.error || !file) return { status: 404, error: "The plan file was not found." };
  if (file.project_id && file.project_id !== args.projectId) return { status: 404, error: "The plan file was not found." };
  if (file.folder_id !== folder.id || !file.s3_key || file.org_id !== args.orgId) {
    return { status: 404, error: "The plan file was not found." };
  }
  if (file.status !== "pending" && file.status !== "active") return { status: 404, error: "The plan file was not found." };

  if (file.status === "pending") {
    const activated = await admin.from("slatedrop_uploads").update({ status: "active" }).eq("id", args.fileId);
    if (activated.error) return { status: 400, error: "The plan could not be saved." };
  }

  const title = String(file.file_name ?? "Project plans").replace(/\.pdf$/i, "");
  const created = await admin
    .from("site_walk_plan_sets")
    .insert({
      org_id: args.orgId,
      project_id: args.projectId,
      title,
      source_file_id: args.fileId,
      source_s3_key: file.s3_key,
      original_file_name: file.file_name,
      mime_type: "application/pdf",
      file_size: Number(file.file_size ?? 0),
      page_count: args.pageCount,
      processing_status: "pending",
      uploaded_by: args.userId,
      kind: "master",
      revision_number: 1,
      is_current_revision: true,
    })
    .select("id")
    .single();
  const planSetId = (created.data as { id?: string } | null)?.id;
  if (created.error || !planSetId) return { status: 400, error: "The plan could not be saved." };

  const sheets = Array.from({ length: args.pageCount }, (_, index) => ({
    org_id: args.orgId,
    project_id: args.projectId,
    plan_set_id: planSetId,
    sheet_number: index + 1,
    sheet_name: args.pageCount === 1 ? title : `Sheet ${index + 1}`,
    sort_order: index,
  }));
  const sheetInsert = await admin.from("site_walk_plan_sheets").insert(sheets);
  if (sheetInsert.error) return { status: 400, error: "The plan could not be saved." };

  await admin.from("plan_raster_jobs").insert({ org_id: args.orgId, plan_set_id: planSetId, status: "queued" });

  try {
    await tasks.trigger("plan.rasterize", { planSetId, orgId: args.orgId }, undefined, triggerRequestOptions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispatch failed";
    await admin
      .from("site_walk_plan_sets")
      .update({ processing_status: "failed", processing_error: message })
      .eq("id", planSetId);
    return { planSetId, status: "failed" };
  }
  return { planSetId, status: "pending" };
}

async function findPlanFolder(admin: Admin, projectId: string): Promise<{ id: string } | null> {
  const result = await admin.from("project_folders").select("id, name, folder_type, project_id").eq("project_id", projectId);
  if (result.error || !Array.isArray(result.data)) return null;
  const match = (result.data as Row[]).find(
    (folder) =>
      folder.project_id === projectId &&
      isPlanUploadFolder({
        folderType: (folder.folder_type as string | null) ?? null,
        name: (folder.name as string | null) ?? null,
      }),
  );
  return match?.id ? { id: String(match.id) } : null;
}
