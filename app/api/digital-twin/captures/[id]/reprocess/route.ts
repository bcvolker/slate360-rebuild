import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest } from "@/lib/server/api-response";
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
 * Twin Slice 1: retry reconstruction directly from a capture. This is the
 * recovery path for a FAILED job (which produced no model, so the model-level
 * reprocess route can't be used) — it lets the post-processing "couldn't
 * finish" screen offer "Try again" instead of a dead-end. Same shared
 * orchestration + non-destructive guarantee as the model-level route.
 */
export const POST = (req: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const { id: captureId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { quality?: string; trainProfile?: unknown };
    const quality = parseQuality(body.quality);
    const trainProfile = parseTrainProfile(body.trainProfile);

    const result = await createReconstructionJob(admin, {
      // A reprocess route is explicit by definition — the caller asked for it.
      confirmProcessing: true,
      orgId,
      userId: user.id,
      userEmail: user.email,
      captureId,
      quality,
      trainProfile,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return ok({ job: result.job, reprocessing: true });
  });
