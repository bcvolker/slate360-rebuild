import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

/**
 * Twin Slice 0: promote a specific model version to be the space's live
 * (published) model. Formalizes the pointer-swap protocol used manually during
 * R7/R8: clear is_primary on every other ready model of the space, set this one
 * is_primary = true, and point space.published_model_id at it. The share/viewer
 * resolution (published_model_id wins, else is_primary) then serves this version
 * everywhere — no reprocess needed, and a prior version is never deleted, so
 * publishing is fully reversible by publishing a different version.
 */
export const POST = (req: NextRequest, ctx: { params: Promise<{ modelId: string }> }) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const { modelId } = await ctx.params;

    const { data: model, error: modelError } = await admin
      .from("digital_twin_models")
      .select("id, space_id, status")
      .eq("id", modelId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();

    if (modelError) return serverError(modelError.message);
    if (!model) return notFound("Model not found");
    if (model.status !== "ready") {
      return badRequest("Only a finished model can be published.");
    }

    // Clear is_primary on all other ready models of this space, then set it here.
    const { error: clearErr } = await admin
      .from("digital_twin_models")
      .update({ is_primary: false })
      .eq("space_id", model.space_id)
      .eq("org_id", orgId)
      .neq("id", modelId);
    if (clearErr) return serverError(clearErr.message);

    const { error: setErr } = await admin
      .from("digital_twin_models")
      .update({ is_primary: true })
      .eq("id", modelId)
      .eq("org_id", orgId);
    if (setErr) return serverError(setErr.message);

    const { error: spaceErr } = await admin
      .from("digital_twin_spaces")
      .update({ published_model_id: modelId, status: "ready" })
      .eq("id", model.space_id)
      .eq("org_id", orgId);
    if (spaceErr) return serverError(spaceErr.message);

    return ok({ published: true, modelId, spaceId: model.space_id });
  });
