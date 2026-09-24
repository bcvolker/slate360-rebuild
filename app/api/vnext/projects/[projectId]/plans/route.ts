import { NextRequest } from "next/server";
import { badRequest, conflict, forbidden, notFound, ok } from "@/lib/server/api-response";
import { withProjectAuth } from "@/lib/server/api-auth";
import { userCanManageVnextProject } from "@/lib/vnext/plans/manage-access";
import { commitProjectPlanUpload, type PlanUploadRejection } from "@/lib/vnext/plans/plan-upload";
import { readProjectPlans } from "@/lib/vnext/plans/read-project-plans";
import { readProjectDocuments } from "@/lib/vnext/documents/read-project-documents";
import { projectIncludesCapability } from "@/lib/vnext/scope/read-project-scope";

type Params = { params: Promise<{ projectId: string }> };

export function GET(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    // Mirrors load-project-documents.ts's own gate: the Plans tab is a sub-section of Documents,
    // so it needs both capabilities included, not just "plans" alone.
    const [documentsIncluded, plansIncluded] = await Promise.all([
      projectIncludesCapability(admin, projectId, "documents"),
      projectIncludesCapability(admin, projectId, "plans"),
    ]);
    if (!documentsIncluded || !plansIncluded) return notFound();
    const documents = await readProjectDocuments(admin, projectId, {
      documentsBase: `/vnext/projects/${projectId}/documents`,
      itemsBase: `/vnext/projects/${projectId}/items`,
      exploreBase: `/vnext/projects/${projectId}/explore`,
    });
    const planSets = await readProjectPlans(admin, projectId, {
      documents: documents.documents,
      documentsBase: `/vnext/projects/${projectId}/documents`,
      exploreBase: `/vnext/projects/${projectId}/explore`,
    });
    return ok({ planSets });
  });
}

export function POST(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, user, projectId, orgId }) => {
    if (!orgId) return badRequest("This project is not ready for plan upload.");
    const allowed = await userCanManageVnextProject(admin, user.id, projectId, orgId);
    if (!allowed) return forbidden("You do not have permission to upload plans.");
    const body = (await req.json().catch(() => null)) as { fileId?: string; pageCount?: number } | null;
    if (!body?.fileId) return badRequest("fileId is required.");
    const result = await commitProjectPlanUpload(admin, {
      projectId,
      orgId,
      userId: user.id,
      fileId: body.fileId,
      pageCount: Number(body.pageCount),
    });
    if ("error" in result) return rejection(result);
    return ok(result, result.status === "failed" ? 200 : 201);
  });
}

function rejection(result: PlanUploadRejection) {
  if (result.status === 403) return forbidden(result.error);
  if (result.status === 404) return notFound(result.error);
  if (result.status === 409) return conflict(result.error);
  return badRequest(result.error);
}
