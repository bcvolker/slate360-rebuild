import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

const triggerRequestOptions = { clientConfig: { previewBranch: "" } };

type RouteContext = { params: Promise<{ sessionId: string }> };

type Body = {
  /** Limit to specific captures; omit to interpret every flagged capture in the session. */
  capture_ids?: string[];
  /** Inspection discipline that scopes allowed causes. */
  profile?: string;
};

/**
 * Opt-in scene-aware AI interpretation. Nothing here costs money until the user
 * presses the "AI scene check" button that calls this route. It dispatches the
 * thermal.interpret task (no job row); the worker enforces the monthly spend cap
 * and writes results back via the signed interpret callback.
 */
export const POST = (req: NextRequest, ctx: RouteContext) =>
  withThermalOpsAuth(req, async ({ admin, orgId, req: request }) => {
    if (!orgId) return badRequest("Organization context required");
    const { sessionId } = await ctx.params;

    const body = (await request.json().catch(() => ({}))) as Body;
    const captureIds = Array.isArray(body.capture_ids) ? body.capture_ids.filter((s) => typeof s === "string") : undefined;
    const profile = typeof body.profile === "string" ? body.profile : "general";

    const { data: session, error: sessionError } = await admin
      .from("thermal_analysis_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (sessionError) return serverError(sessionError.message);
    if (!session) return notFound("Session not found");

    try {
      const { tasks } = await import("@trigger.dev/sdk/v3");
      const handle = await tasks.trigger(
        "thermal.interpret",
        { sessionId, orgId, captureIds, profile },
        undefined,
        triggerRequestOptions,
      );
      return ok({ dispatched: true, runId: handle.id });
    } catch (err) {
      return serverError(`Failed to start AI scene check: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
