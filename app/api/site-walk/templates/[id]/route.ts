/**
 * PATCH  /api/site-walk/templates/[id] — update template
 * DELETE /api/site-walk/templates/[id] — delete template
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import type { UpdateTemplatePayload } from "@/lib/types/site-walk";

export const PATCH = (req: NextRequest, ctx: IdRouteContext) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const body = (await req.json()) as UpdateTemplatePayload;
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description;
    if (body.template_type !== undefined) updates.template_type = body.template_type;
    if (body.checklist_items !== undefined) updates.checklist_items = body.checklist_items;
    if (body.is_default !== undefined) updates.is_default = body.is_default;

    if (Object.keys(updates).length === 0) {
      return badRequest("No valid fields to update");
    }

    const { data, error } = await admin
      .from("site_walk_templates")
      .update(updates)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) return serverError(error.message);
    if (!data) return notFound("Template not found");
    return ok({ template: data });
  });

export const DELETE = (req: NextRequest, ctx: IdRouteContext) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { error } = await admin
      .from("site_walk_templates")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) return serverError(error.message);
    return ok({ deleted: true });
  });
