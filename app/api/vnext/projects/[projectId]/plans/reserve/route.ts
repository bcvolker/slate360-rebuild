import { NextRequest } from "next/server";
import { badRequest, conflict, forbidden, ok } from "@/lib/server/api-response";
import { withProjectAuth } from "@/lib/server/api-auth";
import { userCanManageVnextProject } from "@/lib/vnext/plans/manage-access";
import { reserveProjectPlanUpload, type PlanUploadRejection } from "@/lib/vnext/plans/plan-upload";

type Params = { params: Promise<{ projectId: string }> };

export function POST(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, user, projectId, orgId }) => {
    if (!orgId) return badRequest("This project is not ready for plan upload.");
    const allowed = await userCanManageVnextProject(admin, user.id, projectId, orgId);
    if (!allowed) return forbidden("You do not have permission to upload plans.");
    const body = (await req.json().catch(() => null)) as { filename?: string; size?: number; pageCount?: number } | null;
    if (!body?.filename) return badRequest("filename is required.");
    const result = await reserveProjectPlanUpload(admin, {
      projectId,
      orgId,
      userId: user.id,
      filename: body.filename,
      size: Number(body.size),
      pageCount: Number(body.pageCount),
    });
    if ("error" in result) return rejection(result);
    return ok({ uploadUrl: result.uploadUrl, fileId: result.fileId });
  });
}

function rejection(result: PlanUploadRejection) {
  if (result.status === 403) return forbidden(result.error);
  if (result.status === 409) return conflict(result.error);
  return badRequest(result.error);
}
