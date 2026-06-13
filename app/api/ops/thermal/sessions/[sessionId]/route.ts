import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { loadThermalSessionDetail } from "@/lib/thermal/load-session-data";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { ThermalBrandingConfig } from "@/lib/thermal/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ sessionId: string }> };

type PatchBody = {
  name?: string;
  description?: string;
  branding_config?: Partial<ThermalBrandingConfig>;
  project_id?: string | null;
  metadata?: Record<string, unknown>;
};

export const GET = (req: NextRequest, ctx: RouteContext) =>
  withThermalOpsAuth(req, async () => {
    const { sessionId } = await ctx.params;
    try {
      const detail = await loadThermalSessionDetail(sessionId);
      if (!detail) return notFound("Session not found");
      return ok(detail);
    } catch (err) {
      return serverError(err instanceof Error ? err.message : "Failed to load session");
    }
  });

export const PATCH = (req: NextRequest, ctx: RouteContext) =>
  withThermalOpsAuth(req, async ({ admin, req: request }) => {
    const { sessionId } = await ctx.params;
    const body = (await request.json().catch(() => null)) as PatchBody | null;
    if (!body) return badRequest("Body required");

    const { data: existing, error: loadError } = await admin
      .from("thermal_analysis_sessions")
      .select("id, branding_config, metadata")
      .eq("id", sessionId)
      .is("deleted_at", null)
      .maybeSingle();

    if (loadError) return serverError(loadError.message);
    if (!existing) return notFound("Session not found");

    const patch: Record<string, unknown> = {};
    if (body.name?.trim()) patch.name = body.name.trim();
    if (body.description !== undefined) patch.description = body.description;
    if (body.project_id !== undefined) patch.project_id = body.project_id;
    if (body.branding_config) {
      patch.branding_config = {
        ...(existing.branding_config as Record<string, unknown>),
        ...body.branding_config,
      };
    }
    if (body.metadata) {
      patch.metadata = {
        ...(existing.metadata as Record<string, unknown>),
        ...body.metadata,
      };
    }

    const { data, error } = await admin
      .from("thermal_analysis_sessions")
      .update(patch)
      .eq("id", sessionId)
      .select("id, name, branding_config, summary_metrics")
      .single();

    if (error) return serverError(error.message);
    return ok({ session: data });
  });
