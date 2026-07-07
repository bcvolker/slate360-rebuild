/**
 * GET /api/digital-twin/models/[modelId]/preview-image — redirect to a presigned
 * R2/S3 URL for a twin model's rendered preview (preview_storage_key). Used by the
 * dashboard Featured Project tile to show a real snapshot instead of a placeholder.
 */
import { NextResponse, type NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { notFound, serverError } from "@/lib/server/api-response";
import { getScopedTwinModel } from "@/lib/digital-twin/assert-model-access";
import { resolveDigitalTwinModelUrl } from "@/lib/digital-twin/resolve-model-url";

type RouteCtx = { params: Promise<{ modelId: string }> };

export const GET = (req: NextRequest, ctx: RouteCtx) =>
  withAppAuth("digital_twin", req, async ({ admin, orgId }) => {
    const { modelId } = await ctx.params;
    const model = await getScopedTwinModel(admin, modelId, orgId, "preview_storage_key");
    const previewKey = (model as { preview_storage_key: string | null } | null)?.preview_storage_key;
    if (!previewKey) return notFound("No preview image for this model");

    try {
      const url = await resolveDigitalTwinModelUrl(previewKey);
      return NextResponse.redirect(url);
    } catch (err) {
      return serverError(err instanceof Error ? err.message : "Failed to load preview image");
    }
  });
