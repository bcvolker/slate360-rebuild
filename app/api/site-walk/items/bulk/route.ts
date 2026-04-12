/**
 * PATCH /api/site-walk/items/bulk — bulk update items (status, priority, assignee, workflow)
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import type { ItemStatus, ItemPriority, WorkflowType } from "@/lib/types/site-walk";

type BulkPayload = {
  item_ids: string[];
  item_status?: ItemStatus;
  priority?: ItemPriority;
  workflow_type?: WorkflowType;
  assigned_to?: string | null;
  due_date?: string | null;
};

export const PATCH = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json()) as BulkPayload;
    if (!Array.isArray(body.item_ids) || body.item_ids.length === 0) {
      return badRequest("item_ids must be a non-empty array");
    }
    if (body.item_ids.length > 100) {
      return badRequest("Maximum 100 items per bulk operation");
    }

    const updates: Record<string, unknown> = {};
    if (body.item_status !== undefined) updates.item_status = body.item_status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.workflow_type !== undefined) updates.workflow_type = body.workflow_type;
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to;
    if (body.due_date !== undefined) updates.due_date = body.due_date;

    if (Object.keys(updates).length === 0) {
      return badRequest("No valid fields to update");
    }

    const { data, error } = await admin
      .from("site_walk_items")
      .update(updates)
      .in("id", body.item_ids)
      .eq("org_id", orgId)
      .select("id, item_status, priority, workflow_type, assigned_to, due_date");

    if (error) return serverError(error.message);
    return ok({ updated: data?.length ?? 0, items: data });
  });
