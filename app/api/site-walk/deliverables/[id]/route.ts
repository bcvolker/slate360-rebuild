/**
 * GET    /api/site-walk/deliverables/[id]  — get a single deliverable
 * PATCH  /api/site-walk/deliverables/[id]  — update title/status/content
 * DELETE /api/site-walk/deliverables/[id]  — archive a deliverable
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import {
  ok,
  badRequest,
  notFound,
  serverError,
} from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import type {
  UpdateDeliverablePayload,
  SiteWalkDeliverableStatus,
} from "@/lib/types/site-walk";

const VALID_STATUSES: SiteWalkDeliverableStatus[] = [
  "draft",
  "submitted",
  "shared",
  "archived",
];

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data, error } = await admin
      .from("site_walk_deliverables")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (error || !data) return notFound("Deliverable not found");
    return ok({ deliverable: data });
  });

export const PATCH = (req: NextRequest, ctx: IdRouteContext) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const body = (await req.json()) as UpdateDeliverablePayload;
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      if (!body.title.trim()) return badRequest("title cannot be empty");
      updates.title = body.title.trim();
    }
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return badRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
      }
      updates.status = body.status;
    }
    if (body.content !== undefined) {
      if (!Array.isArray(body.content)) return badRequest("content must be an array");
      updates.content = body.content;
    }

    if (Object.keys(updates).length === 0) {
      return badRequest("No valid fields to update");
    }

    const { data, error } = await admin
      .from("site_walk_deliverables")
      .update(updates)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) return serverError(error.message);
    if (!data) return notFound("Deliverable not found");
    return ok({ deliverable: data });
  });

export const DELETE = (req: NextRequest, ctx: IdRouteContext) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data, error } = await admin
      .from("site_walk_deliverables")
      .update({ status: "archived" })
      .eq("id", id)
      .eq("org_id", orgId)
      .select("id")
      .single();

    if (error) return serverError(error.message);
    if (!data) return notFound("Deliverable not found");
    return ok({ archived: true });
  });
