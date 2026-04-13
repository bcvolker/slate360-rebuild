/**
 * POST /api/site-walk/templates/[id]/apply — apply template to a session
 * Creates items from checklist_items in the template.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import type { ChecklistEntry } from "@/lib/types/site-walk";

type ApplyPayload = { session_id: string };

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;
    const body = (await req.json()) as ApplyPayload;

    if (!body.session_id) return badRequest("session_id is required");

    // Fetch template
    const { data: template, error: tErr } = await admin
      .from("site_walk_templates")
      .select("checklist_items, template_type")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (tErr || !template) return notFound("Template not found");

    const entries = template.checklist_items as ChecklistEntry[];
    if (!entries.length) return badRequest("Template has no checklist items");

    // Get current max sort_order
    const { data: maxItem } = await admin
      .from("site_walk_items")
      .select("sort_order")
      .eq("session_id", body.session_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    let nextOrder = (maxItem?.sort_order ?? -1) + 1;

    const rows = entries.map((entry) => ({
      session_id: body.session_id,
      org_id: orgId,
      created_by: user.id,
      item_type: entry.item_type ?? "text_note",
      title: entry.label,
      workflow_type: entry.workflow_type ?? template.template_type,
      item_status: "open" as const,
      priority: "medium" as const,
      sort_order: nextOrder++,
      metadata: { from_template: id, required: entry.required },
    }));

    const { data: items, error: iErr } = await admin
      .from("site_walk_items")
      .insert(rows)
      .select("id, title, sort_order");

    if (iErr) return serverError(iErr.message);
    return ok({ created: items?.length ?? 0, items }, 201);
  });
