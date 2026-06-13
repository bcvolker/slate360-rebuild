import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

/** List the org's saved report templates. */
export const GET = (req: NextRequest) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    let q = admin
      .from("thermal_report_templates")
      .select("id, name, discipline, config, updated_at")
      .eq("is_archived", false)
      .order("updated_at", { ascending: false });
    if (orgId) q = q.eq("org_id", orgId);
    const { data, error } = await q;
    if (error) return serverError(error.message);
    return ok({ templates: data ?? [] });
  });

/** Create a new saved template. */
export const POST = (req: NextRequest) =>
  withThermalOpsAuth(req, async ({ admin, orgId, user, req: request }) => {
    const body = (await request.json().catch(() => null)) as
      | { name?: string; discipline?: string; config?: Record<string, unknown> }
      | null;
    if (!body?.name?.trim()) return badRequest("name is required");

    const { data, error } = await admin
      .from("thermal_report_templates")
      .insert({
        org_id: orgId,
        created_by: user.id,
        name: body.name.trim(),
        discipline: body.discipline ?? "general",
        config: body.config ?? {},
      })
      .select("id, name, discipline, config, updated_at")
      .single();

    if (error) return serverError(error.message);
    return ok({ template: data });
  });
