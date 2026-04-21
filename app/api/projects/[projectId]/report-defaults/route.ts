/**
 * GET  /api/projects/[projectId]/report-defaults — fetch saved defaults
 * PUT  /api/projects/[projectId]/report-defaults — replace defaults jsonb
 *
 * Used by Site Walk (and future apps) to auto-fill deliverable fields
 * from per-project info the user entered once.
 */
import { NextRequest } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

export const GET = (req: NextRequest, ctx: { params: Promise<{ projectId: string }> }) =>
  withProjectAuth(req, ctx, async ({ admin, project }) => {
    const { data, error } = await admin
      .from("projects")
      .select("report_defaults")
      .eq("id", project.id)
      .single();
    if (error) return serverError(error.message);
    return ok({ report_defaults: data?.report_defaults ?? {} });
  }, "id, name");

export const PUT = (req: NextRequest, ctx: { params: Promise<{ projectId: string }> }) =>
  withProjectAuth(req, ctx, async ({ admin, project }) => {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return badRequest("Body must be a JSON object");
    }
    // Whitelist keys (defensive — never trust client to set arbitrary jsonb)
    const ALLOWED = new Set([
      "project_name", "client_name", "client_email", "project_address",
      "project_number", "inspector_name", "inspector_license",
      "scope_of_work", "default_deliverable_type", "custom_fields",
    ]);
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED.has(k)) clean[k] = v;
    }
    const { error } = await admin
      .from("projects")
      .update({ report_defaults: clean })
      .eq("id", project.id);
    if (error) return serverError(error.message);
    return ok({ report_defaults: clean });
  }, "id, name");
