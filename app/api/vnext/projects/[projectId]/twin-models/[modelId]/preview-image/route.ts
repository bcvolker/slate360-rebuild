/**
 * GET /api/vnext/projects/[projectId]/twin-models/[modelId]/preview-image — vNext-scoped mirror of
 * /api/digital-twin/models/[modelId]/preview-image, used for the vNext client portfolio/Overview
 * Reality hero image. The legacy route gates on the digital_twin standalone-app entitlement (via
 * withAppAuth) and matches the model's org_id against the signed-in user's single org — neither of
 * which reflects the vNext project-access contract (org OR creator OR project_members), so a
 * legitimate cross-org project_members collaborator who can already open the project and its
 * Explore Reality tab could still be refused the hero preview image. This route instead uses
 * withProjectAuth, then proves the requested model actually belongs to a twin space under that
 * already-authorized project (digital_twin_models.space_id -> digital_twin_spaces.project_id) —
 * the same scoping the vNext Explore splat proxy uses — no org check, no standalone-app
 * entitlement, and no way for a model id from a different project to be requested through it.
 */
import { NextResponse, type NextRequest } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { notFound, serverError } from "@/lib/server/api-response";
import { resolveDigitalTwinModelUrl } from "@/lib/digital-twin/resolve-model-url";

type Params = { params: Promise<{ projectId: string; modelId: string }> };

export function GET(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const { modelId } = await ctx.params;

    const { data: model, error } = await admin
      .from("digital_twin_models")
      .select("preview_storage_key, digital_twin_spaces!inner(project_id)")
      .eq("id", modelId)
      .is("deleted_at", null)
      .eq("digital_twin_spaces.project_id", projectId)
      .maybeSingle();

    if (error) return serverError(error.message);
    const previewKey = model?.preview_storage_key as string | null | undefined;
    if (!previewKey) return notFound("No preview image for this model");

    try {
      const url = await resolveDigitalTwinModelUrl(previewKey);
      return NextResponse.redirect(url);
    } catch (err) {
      return serverError(err instanceof Error ? err.message : "Failed to load preview image");
    }
  });
}
