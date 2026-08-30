import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, unauthorized, notFound, forbidden, serverError } from "@/lib/server/api-response";
import { ACTION_ITEM_TYPES, canManageItem, convertQuestionToAction } from "@/lib/spatial-walkthrough/project-items";
import { emitItemEvent, loadItemRow, parseItemType } from "@/lib/spatial-walkthrough/project-item-store";
import { makeItemEvent } from "@/lib/spatial-walkthrough/item-events";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ itemId: string }> };

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user, access }) => {
    if (!orgId) return unauthorized("Organization required");
    if (!canManageItem("contractor", access.canAuthor)) return forbidden("Authoring required");
    const { itemId } = await ctx.params;
    const loaded = await loadItemRow(admin, { orgId, itemId });
    if (!loaded) return notFound("Item not found");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const requested = parseItemType(body?.type ?? "issue");
    const next = convertQuestionToAction(loaded.item, ACTION_ITEM_TYPES.includes(requested) ? requested : "issue");
    const { data: row, error } = await admin.from("spatial_project_items").update({
      type: next.type,
      status: next.status,
      closed_at: next.closedAt,
      updated_at: new Date().toISOString(),
    }).eq("id", itemId).eq("org_id", orgId).select("*").single();
    if (error || !row) return serverError(error?.message ?? "convert failed");
    await emitItemEvent(admin, { orgId, event: makeItemEvent("status_changed", itemId, loaded.item.projectId, user.id, { type: next.type }) });
    return ok({ item: row });
  }, "author");
