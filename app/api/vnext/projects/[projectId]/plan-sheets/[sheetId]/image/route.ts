/**
 * GET /api/vnext/projects/[projectId]/plan-sheets/[sheetId]/image — vNext-scoped mirror of
 * /api/site-walk/plan-sheets/[id]/image. Same rationale as the items/image route: the legacy
 * route requires the punchwalk standalone-app entitlement and an org_id match, not the vNext
 * project-access contract. Uses withProjectAuth, then verifies the sheet belongs to that
 * already-authorized project before signing a URL.
 */
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { notFound, serverError } from "@/lib/server/api-response";
import { BUCKET, s3 } from "@/lib/s3";
import { projectIncludesCapability } from "@/lib/vnext/scope/read-project-scope";
import { clientMayReadSource } from "@/lib/vnext/release/source-visible";

type Params = { params: Promise<{ projectId: string; sheetId: string }> };

export function GET(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, projectId, user }) => {
    const { sheetId } = await ctx.params;
    if (!(await projectIncludesCapability(admin, projectId, "plans"))) return notFound();

    const { data: sheet, error } = await admin
      .from("site_walk_plan_sheets")
      .select("sheet_name, image_s3_key, thumbnail_s3_key, rasterized_key")
      .eq("id", sheetId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (error) return serverError(error.message);
    const key = sheet?.rasterized_key ?? sheet?.thumbnail_s3_key ?? sheet?.image_s3_key;
    if (!key) return notFound("Plan sheet image not found");
    if (!(await clientMayReadSource(admin, projectId, "plans", sheetId, user.email))) return notFound();

    try {
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: key,
          ResponseContentDisposition: `inline; filename="${encodeURIComponent(sheet?.sheet_name ?? sheetId)}"`,
        }),
        { expiresIn: 3600 },
      );
      return NextResponse.redirect(url);
    } catch (err) {
      return serverError(err instanceof Error ? err.message : "Failed to load plan sheet image");
    }
  });
}
