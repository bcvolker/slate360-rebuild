import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, forbidden, serverError } from "@/lib/server/api-response";
import { canManageItem, itemAccessDenied } from "@/lib/spatial-walkthrough/project-items";
import { emitItemEvent, loadItemRow } from "@/lib/spatial-walkthrough/project-item-store";
import { makeItemEvent } from "@/lib/spatial-walkthrough/item-events";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ itemId: string }> };

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user, access }) => {
    if (!orgId) return unauthorized("Organization required");
    if (!canManageItem("contractor", access.canAuthor)) return forbidden("Authoring required");
    const { itemId } = await ctx.params;
    const loaded = await loadItemRow(admin, { orgId, itemId });
    if (!loaded || itemAccessDenied(loaded.item, "contractor", user.id)) return notFound("Item not found");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const documentId = typeof body?.documentId === "string" ? body.documentId : "";
    if (!documentId) return badRequest("documentId required");
    const { data: doc } = await admin.from("spatial_project_documents").select("id, project_id").eq("id", documentId).eq("org_id", orgId).maybeSingle();
    if (!doc || doc.project_id !== loaded.item.projectId) return notFound("Document not found");
    const { error } = await admin.from("spatial_project_item_files").upsert({
      org_id: orgId,
      item_id: itemId,
      document_id: documentId,
    });
    if (error) return serverError(error.message);
    await emitItemEvent(admin, { orgId, event: makeItemEvent("file_added", itemId, loaded.item.projectId, user.id, { documentId }) });
    return ok({ documentId, itemId }, 201);
  }, "author");
