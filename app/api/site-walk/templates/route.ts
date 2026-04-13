/**
 * GET  /api/site-walk/templates — list org templates
 * POST /api/site-walk/templates — create a template
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import type { CreateTemplatePayload } from "@/lib/types/site-walk";

export const GET = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const ttype = req.nextUrl.searchParams.get("template_type");

    let query = admin
      .from("site_walk_templates")
      .select("*")
      .eq("org_id", orgId)
      .order("title", { ascending: true });

    if (ttype) query = query.eq("template_type", ttype);

    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok({ templates: data ?? [] });
  });

export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json()) as CreateTemplatePayload;
    if (!body.title?.trim()) return badRequest("title is required");
    if (!Array.isArray(body.checklist_items)) {
      return badRequest("checklist_items must be an array");
    }

    const { data, error } = await admin
      .from("site_walk_templates")
      .insert({
        org_id: orgId,
        title: body.title.trim(),
        description: body.description ?? null,
        template_type: body.template_type ?? "checklist",
        checklist_items: body.checklist_items,
        is_default: body.is_default ?? false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return serverError(error.message);
    return ok({ template: data }, 201);
  });
