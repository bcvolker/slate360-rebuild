import type { NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, notFound } from "@/lib/server/api-response";
import { getScopedTwinModel } from "@/lib/digital-twin/assert-model-access";
import { s3, BUCKET } from "@/lib/s3";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ modelId: string }> };

type FloorPlanAreas = {
  closed?: boolean;
  floorAreaM2?: number | null;
  floorAreaFt2?: number | null;
  usableAreaM2?: number | null;
  roomCount?: number | null;
  wallAreaGrossM2?: number | null;
  wallAreaGrossFt2?: number | null;
  wallAreaNetM2?: number | null;
  wallAreaNetFt2?: number | null;
  ceilingHeightM?: number | null;
  notes?: string[];
  accuracy?: string;
} | null;

/**
 * GET /api/digital-twin/models/[modelId]/floor-plan-data
 *
 * F3 — vector floor-plan areas (quality_metrics.floorPlan, computed by
 * compute_vector_floor_plan) plus signed download URLs for the SVG/DXF
 * derivatives (quality_metrics.derivativeKeys.floorplanSvg/floorplanDxf).
 * Separate from GET .../floor-plan, which redirects to the raster PNG preview.
 */
export const GET = (req: NextRequest, ctx: RouteCtx) =>
  withAppAuth("digital_twin", req, async ({ admin, orgId }) => {
    const { modelId } = await ctx.params;

    const model = await getScopedTwinModel(admin, modelId, orgId, "id, quality_metrics");
    if (!model) return notFound("Model not found");

    const qm = (model as { quality_metrics?: Record<string, unknown> }).quality_metrics ?? {};
    const areas = (qm.floorPlan ?? null) as FloorPlanAreas;
    const derivativeKeys = (qm.derivativeKeys ?? {}) as Record<string, string>;

    const sign = async (key: string | undefined) => {
      if (!key) return null;
      try {
        return await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
          expiresIn: 3600,
        });
      } catch {
        return null;
      }
    };

    const [svgUrl, dxfUrl] = await Promise.all([
      sign(derivativeKeys.floorplanSvg),
      sign(derivativeKeys.floorplanDxf),
    ]);

    return ok({ areas, svgUrl, dxfUrl });
  });
