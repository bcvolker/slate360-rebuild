import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, unauthorized, notFound, forbidden } from "@/lib/server/api-response";
import { applyStatus, canManageItem, itemAccessDenied, toProjectItemActivity, toProjectItemComment } from "@/lib/spatial-walkthrough/project-items";
import {
  emitItemEvent,
  kindFromPatch,
  loadDocumentsForItems,
  loadItemRow,
  parsePriority,
  parseStatus,
  parseVisibility,
} from "@/lib/spatial-walkthrough/project-item-store";
import { makeItemEvent } from "@/lib/spatial-walkthrough/item-events";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ itemId: string }> };

export const GET = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user, access }) => {
    if (!orgId) return unauthorized("Organization required");
    const { itemId } = await ctx.params;
    const loaded = await loadItemRow(admin, { orgId, itemId });
    const audience = access.canView ? "contractor" as const : "client";
    if (!loaded || itemAccessDenied(loaded.item, audience, user.id)) return notFound("Item not found");
    const [{ data: comments }, { data: activity }, docs] = await Promise.all([
      admin.from("spatial_project_item_comments").select("*").eq("item_id", itemId).order("created_at"),
      admin.from("spatial_project_item_activity").select("*").eq("item_id", itemId).order("created_at"),
      loadDocumentsForItems(admin, [itemId]),
    ]);
    return ok({
      item: loaded.item,
      comments: (comments ?? []).map((row) => toProjectItemComment(row as Record<string, unknown>)),
      activity: (activity ?? []).map((row) => toProjectItemActivity(row as Record<string, unknown>)),
      files: docs.get(itemId) ?? [],
    });
  });

export const PATCH = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user, access }) => {
    if (!orgId) return unauthorized("Organization required");
    if (!canManageItem("contractor", access.canAuthor)) return forbidden("Authoring required");
    const { itemId } = await ctx.params;
    const loaded = await loadItemRow(admin, { orgId, itemId });
    if (!loaded) return notFound("Item not found");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body?.title === "string") patch.title = body.title.trim();
    if (typeof body?.description === "string") patch.description = body.description;
    if (body?.status) {
      const next = applyStatus(loaded.item, parseStatus(body.status), new Date().toISOString());
      patch.status = next.status;
      patch.closed_at = next.closedAt;
    }
    if (body?.priority) patch.priority = parsePriority(body.priority);
    if (body?.visibility) patch.visibility = parseVisibility(body.visibility, loaded.item.visibility);
    if ("assigneeId" in (body ?? {})) patch.assignee_id = typeof body?.assigneeId === "string" ? body.assigneeId : null;
    if ("dueDate" in (body ?? {})) patch.due_date = typeof body?.dueDate === "string" ? body.dueDate : null;
    const { data: row, error } = await admin.from("spatial_project_items").update(patch).eq("id", itemId).eq("org_id", orgId).select("*").single();
    if (error || !row) return notFound("Item not found");
    const kind = kindFromPatch(parseStatus(patch.status), loaded.item.status);
    if (kind) {
      await emitItemEvent(admin, { orgId, event: makeItemEvent(kind, itemId, loaded.item.projectId, user.id, { status: patch.status }) });
    }
    if ("assigneeId" in (body ?? {})) {
      await emitItemEvent(admin, { orgId, event: makeItemEvent("assigned", itemId, loaded.item.projectId, user.id, { assigneeId: patch.assignee_id }) });
    }
    return ok({ item: row });
  });
