/**
 * GET    /api/site-walk/deliverables/[id]  — get a single deliverable
 * PATCH  /api/site-walk/deliverables/[id]  — update title/status/content
 * DELETE /api/site-walk/deliverables/[id]  — archive a deliverable
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import {
  ok,
  badRequest,
  notFound,
  serverError,
} from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import {
  SITE_WALK_DELIVERABLE_STATUSES,
  SITE_WALK_OUTPUT_MODES,
  type UpdateDeliverablePayload,
} from "@/lib/types/site-walk";

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
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
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const body = (await req.json()) as UpdateDeliverablePayload;
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      if (!body.title.trim()) return badRequest("title cannot be empty");
      updates.title = body.title.trim();
    }
    if (body.status !== undefined) {
      if (!SITE_WALK_DELIVERABLE_STATUSES.includes(body.status)) {
        return badRequest(`Invalid status. Must be one of: ${SITE_WALK_DELIVERABLE_STATUSES.join(", ")}`);
      }
      updates.status = body.status;
    }
    if (body.content !== undefined) {
      if (!Array.isArray(body.content)) return badRequest("content must be an array");
      updates.content = body.content;
    }
    if (body.output_mode !== undefined) {
      if (!SITE_WALK_OUTPUT_MODES.includes(body.output_mode)) {
        return badRequest(`output_mode must be one of: ${SITE_WALK_OUTPUT_MODES.join(", ")}`);
      }
      updates.output_mode = body.output_mode;
    }
    if (body.portal_config !== undefined) updates.portal_config = body.portal_config;
    if (body.presentation_config !== undefined) updates.presentation_config = body.presentation_config;
    if (body.kanban_config !== undefined) updates.kanban_config = body.kanban_config;
    if (body.export_config !== undefined) updates.export_config = body.export_config;
    if (body.viewer_config !== undefined) updates.viewer_config = body.viewer_config;
    if (body.response_config !== undefined) updates.response_config = body.response_config;
    if (body.navigation_config !== undefined) updates.navigation_config = body.navigation_config;
    if (body.allow_viewer_responses !== undefined) {
      updates.allow_viewer_responses = body.allow_viewer_responses;
    }
    if (body.allow_viewer_download !== undefined) {
      updates.allow_viewer_download = body.allow_viewer_download;
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
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
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
