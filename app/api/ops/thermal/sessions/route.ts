import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { loadThermalSessionList } from "@/lib/thermal/load-session-data";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

type CreateBody = {
  name: string;
  description?: string;
  project_id?: string;
  metadata?: Record<string, unknown>;
};

export const GET = (req: NextRequest) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    try {
      const sessions = await loadThermalSessionList(orgId);
      return ok({ sessions });
    } catch (err) {
      return serverError(err instanceof Error ? err.message : "Failed to list sessions");
    }
  });

export const POST = (req: NextRequest) =>
  withThermalOpsAuth(req, async ({ user, admin, orgId, req: request }) => {
    const body = (await request.json().catch(() => null)) as CreateBody | null;
    if (!body?.name?.trim()) return badRequest("name is required");

    const { data, error } = await admin
      .from("thermal_analysis_sessions")
      .insert({
        org_id: orgId,
        project_id: body.project_id ?? null,
        created_by: user.id,
        name: body.name.trim(),
        description: body.description?.trim() ?? null,
        status: "draft",
        metadata: body.metadata ?? {},
      })
      .select("id, name, status, created_at")
      .single();

    if (error || !data) return serverError(error?.message ?? "Failed to create session");
    return ok({ session: data }, 201);
  });
