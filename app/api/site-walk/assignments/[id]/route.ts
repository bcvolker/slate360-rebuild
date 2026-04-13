/**
 * GET    /api/site-walk/assignments/[id]  — get a single assignment
 * PATCH  /api/site-walk/assignments/[id]  — update status/priority/details
 * DELETE /api/site-walk/assignments/[id]  — delete (assigner only)
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import type { UpdateAssignmentPayload, AssignmentPriority, AssignmentStatus } from "@/lib/types/site-walk";

const VALID_STATUSES: AssignmentStatus[] = [
  "pending", "acknowledged", "in_progress", "done", "rejected",
];
const VALID_PRIORITIES: AssignmentPriority[] = ["low", "medium", "high", "critical"];

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data, error } = await admin
      .from("site_walk_assignments")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (error || !data) return notFound("Assignment not found");
    return ok({ assignment: data });
  });

export const PATCH = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const body = (await req.json()) as UpdateAssignmentPayload;
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      if (!body.title.trim()) return badRequest("title cannot be empty");
      updates.title = body.title.trim();
    }
    if (body.description !== undefined) updates.description = body.description;
    if (body.due_date !== undefined) updates.due_date = body.due_date;

    if (body.priority !== undefined) {
      if (!VALID_PRIORITIES.includes(body.priority)) {
        return badRequest(`priority must be one of: ${VALID_PRIORITIES.join(", ")}`);
      }
      updates.priority = body.priority;
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return badRequest(`status must be one of: ${VALID_STATUSES.join(", ")}`);
      }
      updates.status = body.status;
      if (body.status === "acknowledged") updates.acknowledged_at = new Date().toISOString();
      if (body.status === "done") updates.completed_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return badRequest("No valid fields to update");
    }

    const { data, error } = await admin
      .from("site_walk_assignments")
      .update(updates)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) return serverError(error.message);
    if (!data) return notFound("Assignment not found");
    return ok({ assignment: data });
  });

export const DELETE = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { error } = await admin
      .from("site_walk_assignments")
      .delete()
      .eq("id", id)
      .eq("assigned_by", user.id);

    if (error) return serverError(error.message);
    return ok({ deleted: true });
  });
