/**
 * PATCH /api/site-walk/items/bulk — bulk update items (status, priority, assignee, workflow)
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import type { ItemStatus, ItemPriority, WorkflowType } from "@/lib/types/site-walk";
import { notifyAssignment } from "@/lib/site-walk/notify-assignment";

type BulkPayload = {
  item_ids: string[];
  item_status?: ItemStatus;
  priority?: ItemPriority;
  workflow_type?: WorkflowType;
  assigned_to?: string | null;
  due_date?: string | null;
};

export const PATCH = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId, user }) => {
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
      .select("id, session_id, title, item_status, priority, workflow_type, assigned_to, due_date");

    if (error) return serverError(error.message);

    // Fire-and-forget assignment notifications
    if (body.assigned_to && Array.isArray(data)) {
      const assignee = body.assigned_to;
      for (const row of data) {
        const sessionId = (row as { session_id?: unknown }).session_id;
        const itemId = (row as { id?: unknown }).id;
        if (typeof sessionId !== "string" || typeof itemId !== "string") continue;
        void notifyAssignment({
          kind: "item",
          sessionId,
          assigneeUserId: assignee,
          assignerUserId: user.id,
          title: ((row as { title?: unknown }).title as string | null) ?? "Punch list item",
          priority: ((row as { priority?: unknown }).priority as string | null) ?? null,
          dueDate: ((row as { due_date?: unknown }).due_date as string | null) ?? null,
          itemId,
        });
      }
    }

    return ok({ updated: data?.length ?? 0, items: data });
  });
