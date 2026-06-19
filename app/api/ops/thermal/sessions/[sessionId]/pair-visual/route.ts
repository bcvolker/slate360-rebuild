import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { applyVisualPairs } from "@/lib/thermal/pair-visual-apply";

export const runtime = "nodejs";

type Params = { params: Promise<{ sessionId: string }> };

/** Auto-pairs thermal & visual captures across the session by filename. */
export const POST = (req: NextRequest, { params }: Params) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { sessionId } = await params;
    if (!sessionId) return badRequest("sessionId is required");

    const { data: session, error } = await admin
      .from("thermal_analysis_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) return serverError(error.message);
    if (!session) return notFound("Session not found");

    try {
      const linked = await applyVisualPairs(admin, sessionId, orgId);
      return ok({ linked });
    } catch (err) {
      return serverError(err instanceof Error ? err.message : "Pairing failed");
    }
  });
