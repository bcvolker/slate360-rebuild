/**
 * GET    /api/site-walk/items/[id]  — get a single item
 * PATCH  /api/site-walk/items/[id]  — update item fields
 * DELETE /api/site-walk/items/[id]  — permanently delete an item
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import type { UpdateItemPayload } from "@/lib/types/site-walk";

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data, error } = await admin
      .from("site_walk_items")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (error || !data) return notFound("Item not found");
    return ok({ item: data });
  });

export const PATCH = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const body = (await req.json()) as UpdateItemPayload;
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
    if (body.location_label !== undefined) updates.location_label = body.location_label;
    if (body.metadata !== undefined) updates.metadata = body.metadata;
    if (body.workflow_type !== undefined) updates.workflow_type = body.workflow_type;
    if (body.item_status !== undefined) updates.item_status = body.item_status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to;
    if (body.due_date !== undefined) updates.due_date = body.due_date;
    if (body.cost_estimate !== undefined) updates.cost_estimate = body.cost_estimate;
    if (body.manpower_hours !== undefined) updates.manpower_hours = body.manpower_hours;
    if (body.before_item_id !== undefined) updates.before_item_id = body.before_item_id;

    if (Object.keys(updates).length === 0) {
      return badRequest("No valid fields to update");
    }

    const { data, error } = await admin
      .from("site_walk_items")
      .update(updates)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) return serverError(error.message);
    if (!data) return notFound("Item not found");
    return ok({ item: data });
  });

export const DELETE = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { error } = await admin
      .from("site_walk_items")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) return serverError(error.message);
    return ok({ deleted: true });
  });
