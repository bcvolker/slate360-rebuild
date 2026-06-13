import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

type Params = { params: Promise<{ templateId: string }> };

/** Update a saved template (name / discipline / config). */
export const PATCH = (req: NextRequest, { params }: Params) =>
  withThermalOpsAuth(req, async ({ admin, orgId, req: request }) => {
    const { templateId } = await params;
    const body = (await request.json().catch(() => null)) as
      | { name?: string; discipline?: string; config?: Record<string, unknown> }
      | null;
    if (!body) return badRequest("Body required");

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name?.trim()) patch.name = body.name.trim();
    if (body.discipline) patch.discipline = body.discipline;
    if (body.config) patch.config = body.config;

    let q = admin.from("thermal_report_templates").update(patch).eq("id", templateId);
    if (orgId) q = q.eq("org_id", orgId);
    const { data, error } = await q.select("id, name, discipline, config, updated_at").maybeSingle();

    if (error) return serverError(error.message);
    if (!data) return notFound("Template not found");
    return ok({ template: data });
  });

/** Archive (soft-delete) a saved template. */
export const DELETE = (req: NextRequest, { params }: Params) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    const { templateId } = await params;
    let q = admin
      .from("thermal_report_templates")
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq("id", templateId);
    if (orgId) q = q.eq("org_id", orgId);
    const { error } = await q;
    if (error) return serverError(error.message);
    return ok({ archived: true });
  });
