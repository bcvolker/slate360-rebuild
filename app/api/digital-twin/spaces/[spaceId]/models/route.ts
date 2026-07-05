import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

type QualityMetrics = { trainPsnr?: number; splatCount?: number; quality?: string } | null;

/**
 * Twin Slice 0: list a space's ready model versions for the version picker /
 * reprocess loop. Returns each version's headline quality signals (PSNR, splat
 * count) + which one is currently published, so a user can compare a reprocess
 * result against the live model and promote the better one.
 */
export const GET = (req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const { spaceId } = await ctx.params;

    const { data: space, error: spaceError } = await admin
      .from("digital_twin_spaces")
      .select("id, published_model_id")
      .eq("id", spaceId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (spaceError) return serverError(spaceError.message);
    if (!space) return notFound("Space not found");

    const { data: models, error: modelsError } = await admin
      .from("digital_twin_models")
      .select("id, title, created_at, is_primary, file_size_bytes, quality_metrics, capture_id")
      .eq("space_id", spaceId)
      .eq("org_id", orgId)
      .eq("status", "ready")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (modelsError) return serverError(modelsError.message);

    const versions = (models ?? []).map((m) => {
      const qm = m.quality_metrics as QualityMetrics;
      return {
        id: m.id,
        title: m.title,
        createdAt: m.created_at,
        isPublished: space.published_model_id
          ? m.id === space.published_model_id
          : Boolean(m.is_primary),
        fileSizeBytes: m.file_size_bytes,
        psnr: qm?.trainPsnr ?? null,
        splatCount: qm?.splatCount ?? null,
        quality: qm?.quality ?? null,
        captureId: m.capture_id,
      };
    });

    return ok({ versions, publishedModelId: space.published_model_id });
  });
