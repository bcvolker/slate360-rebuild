import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

type Params = { params: Promise<{ captureId: string }> };

type SpotPayload = { id: string; x: number; y: number; imported?: boolean };
type TuningPayload = { emissivity?: number; reflected_c?: number };

/**
 * Persists per-image edits onto a capture's metadata:
 *  - `metadata.spots`  user-authored probe spots (imported=true for baked markers)
 *  - `metadata.tuning` emissivity / reflected-temp tuning
 */
export const PATCH = (req: NextRequest, { params }: Params) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    const { captureId } = await params;
    if (!captureId) return badRequest("captureId is required");

    let body: { spots?: SpotPayload[]; tuning?: TuningPayload };
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }
    if (body.spots === undefined && body.tuning === undefined) {
      return badRequest("Nothing to update");
    }

    const { data: capture, error } = await admin
      .from("thermal_captures")
      .select("id, org_id, metadata")
      .eq("id", captureId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return serverError(error.message);
    if (!capture || (orgId && capture.org_id && capture.org_id !== orgId)) {
      return notFound("Capture not found");
    }

    const metadata = { ...((capture.metadata ?? {}) as Record<string, unknown>) };

    if (Array.isArray(body.spots)) {
      metadata.spots = body.spots
        .filter((s) => s && typeof s.id === "string" && Number.isFinite(s.x) && Number.isFinite(s.y))
        .map((s) => ({ id: s.id, x: s.x, y: s.y, imported: Boolean(s.imported) }));
    }

    if (body.tuning && typeof body.tuning === "object") {
      const emissivity = Number(body.tuning.emissivity);
      const reflected = Number(body.tuning.reflected_c);
      metadata.tuning = {
        emissivity: Number.isFinite(emissivity) ? emissivity : 0.95,
        reflected_c: Number.isFinite(reflected) ? reflected : 20,
      };
    }

    const { error: updateError } = await admin
      .from("thermal_captures")
      .update({ metadata })
      .eq("id", captureId);

    if (updateError) return serverError(updateError.message);
    return ok({ captureId, metadata });
  });
