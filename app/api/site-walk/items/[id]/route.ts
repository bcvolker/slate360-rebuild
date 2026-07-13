/**
 * GET    /api/site-walk/items/[id]  — get a single item
 * PATCH  /api/site-walk/items/[id]  — update item fields
 * DELETE /api/site-walk/items/[id]  — soft-delete an item (sets deleted_at)
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import type { UpdateItemPayload } from "@/lib/types/site-walk";
import { notifyAssignment } from "@/lib/site-walk/notify-assignment";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";
import { isMarkupData } from "@/lib/site-walk/markup-types";

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    let query = admin
      .from("site_walk_items")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId);
    query = excludeDeletedSiteWalkItems(query);

    const { data, error } = await query.single();

    if (error || !data) return notFound("Item not found");
    return ok({ item: data });
  });

export const PATCH = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId, user }) => {
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
    if (body.item_relationship !== undefined) updates.item_relationship = body.item_relationship;
    if (body.capture_mode !== undefined) updates.capture_mode = body.capture_mode;
    if (body.sync_state !== undefined) updates.sync_state = body.sync_state;
    if (body.upload_state !== undefined) updates.upload_state = body.upload_state;
    if (body.upload_progress !== undefined) updates.upload_progress = body.upload_progress;
    if (body.vector_history !== undefined) updates.vector_history = body.vector_history;
    if (body.markup_data !== undefined) {
      if (body.markup_data !== null && !isMarkupData(body.markup_data)) {
        return badRequest("markup_data must match the MarkupData v1 schema");
      }
      updates.markup_data = body.markup_data;
    }
    if (body.markup_revision !== undefined) updates.markup_revision = body.markup_revision;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.trade !== undefined) updates.trade = body.trade;
    if (body.category !== undefined) updates.category = body.category;

    // Offline conflict handling (HLC): if the client supplies a hybrid logical clock,
    // stamp it and flag a conflict when the incoming write is NOT strictly newer than
    // the stored one (a concurrent edit by another device). Last-write-wins still
    // applies; conflict_flag surfaces it for review. (Client HLC generation lands later.)
    const raw = body as unknown as Record<string, unknown>;
    const incomingHlc = typeof raw.hlc === "string" ? raw.hlc : null;
    if (incomingHlc) {
      const { data: current } = await admin
        .from("site_walk_items")
        .select("hlc")
        .eq("id", id)
        .eq("org_id", orgId)
        .maybeSingle();
      const storedHlc = (current?.hlc as string | null) ?? null;
      updates.hlc = incomingHlc;
      if (typeof raw.author_node_id === "string") updates.author_node_id = raw.author_node_id;
      updates.conflict_flag = storedHlc !== null && incomingHlc <= storedHlc;
    }

    if (Object.keys(updates).length === 0) {
      return badRequest("No valid fields to update");
    }

    let updateQuery = admin
      .from("site_walk_items")
      .update(updates)
      .eq("id", id)
      .eq("org_id", orgId);
    updateQuery = excludeDeletedSiteWalkItems(updateQuery);

    const { data, error } = await updateQuery.select().single();

    if (error) return serverError(error.message);
    if (!data) return notFound("Item not found");

    // Fire-and-forget notification when assignment changes to a new user
    if (
      body.assigned_to !== undefined &&
      body.assigned_to &&
      typeof data.session_id === "string"
    ) {
      void notifyAssignment({
        kind: "item",
        sessionId: data.session_id as string,
        assigneeUserId: body.assigned_to,
        assignerUserId: user.id,
        title: (data.title as string | null) ?? "Punch list item",
        priority: (data.priority as string | null) ?? null,
        dueDate: (data.due_date as string | null) ?? null,
        itemId: data.id as string,
      });
    }

    return ok({ item: data });
  });

export const DELETE = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    let deleteQuery = admin
      .from("site_walk_items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("org_id", orgId);
    deleteQuery = excludeDeletedSiteWalkItems(deleteQuery);

    const { data, error } = await deleteQuery.select("id").maybeSingle();

    if (error) return serverError(error.message);
    if (!data) return notFound("Item not found");

    // A plan pin can point at this item (site_walk_pins.item_id). Left alone, the
    // pin keeps rendering as "captured" on the plan while its detail sheet finds
    // nothing — an orphan. Revert it to an empty/uncaptured pin (same shape as a
    // freshly dropped one) so the location is still marked but re-capturable.
    const { error: pinError } = await admin
      .from("site_walk_pins")
      .update({ item_id: null, pin_status: "draft" })
      .eq("item_id", id)
      .eq("org_id", orgId);
    if (pinError) console.error("[items DELETE] failed to clear pin for deleted item", pinError);

    return ok({ deleted: true, soft: true });
  });
