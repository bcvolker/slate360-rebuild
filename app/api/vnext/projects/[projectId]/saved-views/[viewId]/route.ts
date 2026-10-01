import { NextRequest } from "next/server";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/server/api-response";
import { withProjectAuth } from "@/lib/server/api-auth";
import { deleteSavedView, renameSavedView } from "@/lib/vnext/views/write-saved-view";

type Params = { params: Promise<{ projectId: string; viewId: string }> };

export function PATCH(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, user, projectId, orgId }) => {
    const { viewId } = await ctx.params;
    const body = (await req.json().catch(() => null)) as { title?: unknown } | null;
    if (!body || typeof body.title !== "string") return badRequest("A title is required.");
    const result = await renameSavedView(admin, user.id, projectId, orgId, viewId, body.title);
    if (result === "ok") return ok({ ok: true });
    if (result === "denied") return forbidden("You do not have permission to rename this view.");
    if (result === "invalid") return badRequest("Enter a title.");
    if (result === "missing") return notFound("Not found");
    return serverError("The view could not be renamed.");
  });
}

export function DELETE(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, user, projectId, orgId }) => {
    const { viewId } = await ctx.params;
    const result = await deleteSavedView(admin, user.id, projectId, orgId, viewId);
    if (result === "ok") return ok({ ok: true });
    if (result === "denied") return forbidden("You do not have permission to delete this view.");
    if (result === "missing") return notFound("Not found");
    return serverError("The view could not be deleted.");
  });
}
