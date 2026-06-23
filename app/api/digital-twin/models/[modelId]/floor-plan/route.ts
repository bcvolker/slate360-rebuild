import type { NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withAppAuth } from "@/lib/server/api-auth";
import { notFound, serverError } from "@/lib/server/api-response";
import { getScopedTwinModel } from "@/lib/digital-twin/assert-model-access";
import { s3, BUCKET } from "@/lib/s3";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ modelId: string }> };

/**
 * GET /api/digital-twin/models/[modelId]/floor-plan
 *
 * Returns a 302 redirect to a signed R2 URL for the floor plan PNG generated
 * during Gaussian splat processing.  The browser can follow and cache the image
 * directly.  Missing floor plan (no key stored) → 404.
 */
export const GET = (req: NextRequest, ctx: RouteCtx) =>
  withAppAuth("digital_twin", req, async ({ admin, orgId }) => {
    const { modelId } = await ctx.params;

    const model = await getScopedTwinModel(admin, modelId, orgId, "id, floorplan_storage_key");
    if (!model) return notFound("Model not found");

    const key = (model as { floorplan_storage_key?: string | null }).floorplan_storage_key;
    if (!key) return notFound("Floor plan not available for this model");

    try {
      const signedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: key }),
        { expiresIn: 3600 },
      );
      return Response.redirect(signedUrl, 302);
    } catch (err) {
      console.error("[GET /api/digital-twin/models/[modelId]/floor-plan]", err);
      return serverError(err instanceof Error ? err.message : "Failed to generate signed URL");
    }
  });
