import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { NextResponse } from "next/server";
import { createReconstructionJob, type TwinTrainProfile } from "@/lib/twin/create-reconstruction-job";
import type { TwinProcessingQuality } from "@/lib/twin/processing-estimate-types";

export const runtime = "nodejs";

function parseQuality(value: unknown): TwinProcessingQuality {
  return value === "high" ? "high" : "standard";
}

/** B1: owner-only A/B lever — validated so a bad value falls through to the
 * worker's promoted default instead of erroring the whole reprocess. */
function parseTrainProfile(value: unknown): TwinTrainProfile | undefined {
  return value === "baseline" || value === "quality" || value === "visual" ? value : undefined;
}

/**
 * Twin Slice 0/1: re-run reconstruction for the capture behind an existing
 * model, without touching the currently-published model (see
 * createReconstructionJob for the non-destructive guarantee). Thin wrapper —
 * all orchestration lives in the shared helper so the capture-level retry path
 * behaves identically.
 */
export const POST = (req: NextRequest, ctx: { params: Promise<{ modelId: string }> }) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const { modelId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { quality?: string; trainProfile?: unknown };
    const quality = parseQuality(body.quality);
    const trainProfile = parseTrainProfile(body.trainProfile);

    const { data: model, error: modelError } = await admin
      .from("digital_twin_models")
      .select("id, capture_id")
      .eq("id", modelId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (modelError) return serverError(modelError.message);
    if (!model) return notFound("Model not found");
    if (!model.capture_id) return badRequest("This model has no source capture to reprocess.");

    const result = await createReconstructionJob(admin, {
      orgId,
      userId: user.id,
      userEmail: user.email,
      captureId: model.capture_id,
      quality,
      trainProfile,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return ok({ job: result.job, reprocessing: true });
  });
