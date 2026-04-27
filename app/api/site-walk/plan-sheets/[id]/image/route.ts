import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { badRequest, notFound, serverError } from "@/lib/server/api-response";
import { BUCKET, s3 } from "@/lib/s3";
import type { IdRouteContext } from "@/lib/types/api";

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data: sheet, error } = await admin
      .from("site_walk_plan_sheets")
      .select("sheet_name, image_s3_key, thumbnail_s3_key")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) return serverError(error.message);
    const key = sheet?.thumbnail_s3_key ?? sheet?.image_s3_key;
    if (!key) return notFound("Plan sheet image not found");

    try {
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: key,
          ResponseContentDisposition: `inline; filename="${encodeURIComponent(sheet?.sheet_name ?? id)}"`,
        }),
        { expiresIn: 3600 },
      );
      return NextResponse.redirect(url);
    } catch (error) {
      return serverError(error instanceof Error ? error.message : "Failed to load plan sheet image");
    }
  });
