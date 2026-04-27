import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { badRequest, ok, serverError } from "@/lib/server/api-response";
import { getScopedProjectForUser } from "@/lib/projects/access";

type UploadRow = {
  id: string;
  file_name: string | null;
  file_size: number | string | null;
  file_type: string | null;
  s3_key: string | null;
  unified_file_id: string | null;
};

type CreatePlanSetBody = {
  projectId?: string;
  title?: string;
  description?: string;
  fileId?: string;
  s3Key?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
  pageCount?: number;
};

export const GET = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const projectId = req.nextUrl.searchParams.get("project_id")?.trim();
    if (!projectId) return badRequest("project_id is required");

    const { project } = await getScopedProjectForUser(user.id, projectId, "id");
    if (!project) return badRequest("Project not found or access denied");

    const { data: planSets, error: setError } = await admin
      .from("site_walk_plan_sets")
      .select("*")
      .eq("project_id", projectId)
      .eq("org_id", orgId)
      .neq("processing_status", "archived")
      .order("created_at", { ascending: false });
    if (setError) return serverError(setError.message);

    const { data: sheets, error: sheetError } = await admin
      .from("site_walk_plan_sheets")
      .select("*")
      .eq("project_id", projectId)
      .eq("org_id", orgId)
      .order("sort_order", { ascending: true });
    if (sheetError) return serverError(sheetError.message);

    return ok({ planSets: planSets ?? [], sheets: sheets ?? [] });
  });

export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const body = (await req.json().catch(() => null)) as CreatePlanSetBody | null;
    if (!body?.projectId || !body.fileId || !body.s3Key) {
      return badRequest("projectId, fileId, and s3Key are required");
    }

    const { project } = await getScopedProjectForUser(user.id, body.projectId, "id, name");
    if (!project) return badRequest("Project not found or access denied");

    const { data: upload, error: uploadError } = await admin
      .from("slatedrop_uploads")
      .select("id, file_name, file_size, file_type, s3_key, unified_file_id")
      .eq("id", body.fileId)
      .eq("org_id", orgId)
      .eq("status", "active")
      .maybeSingle<UploadRow>();
    if (uploadError) return serverError(uploadError.message);
    if (!upload?.s3_key || upload.s3_key !== body.s3Key) {
      return badRequest("Completed SlateDrop upload not found");
    }

    const title = body.title?.trim() || upload.file_name || "Untitled plan set";
    const pageCount = Math.max(1, Math.min(250, Math.floor(body.pageCount ?? 1)));
    const { data: planSet, error: setError } = await admin
      .from("site_walk_plan_sets")
      .insert({
        org_id: orgId,
        project_id: body.projectId,
        title,
        description: body.description?.trim() || null,
        source_file_id: upload.id,
        source_unified_file_id: upload.unified_file_id,
        source_s3_key: upload.s3_key,
        original_file_name: body.originalFileName ?? upload.file_name,
        mime_type: body.mimeType ?? upload.file_type ?? "application/pdf",
        file_size: Number(upload.file_size ?? body.fileSize ?? 0),
        page_count: pageCount,
        processing_status: "ready",
        uploaded_by: user.id,
        metadata: { slateDropFolder: "Site Walk Files/Plans" },
      })
      .select("*")
      .single();
    if (setError || !planSet) return serverError(setError?.message ?? "Failed to create plan set");

    const sheetRows = Array.from({ length: pageCount }, (_, index) => ({
      org_id: orgId,
      project_id: body.projectId,
      plan_set_id: planSet.id,
      sheet_number: index + 1,
      sheet_name: pageCount === 1 ? title : `${title} — Sheet ${index + 1}`,
      sort_order: index,
      metadata: { sourceFileId: upload.id, extractionStatus: "queued" },
    }));

    const { data: sheets, error: sheetError } = await admin
      .from("site_walk_plan_sheets")
      .insert(sheetRows)
      .select("*");
    if (sheetError) return serverError(sheetError.message);

    return ok({ planSet, sheets: sheets ?? [] }, 201);
  });
