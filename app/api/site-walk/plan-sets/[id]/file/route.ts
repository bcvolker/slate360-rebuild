import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { badRequest, notFound, serverError } from "@/lib/server/api-response";
import { BUCKET, s3 } from "@/lib/s3";
import type { IdRouteContext } from "@/lib/types/api";

type PlanSetFileRow = {
  title: string | null;
  original_file_name: string | null;
  source_s3_key: string | null;
  mime_type: string | null;
};

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data: planSet, error } = await admin
      .from("site_walk_plan_sets")
      .select("title, original_file_name, source_s3_key, mime_type")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle<PlanSetFileRow>();

    if (error) return serverError(error.message);
    if (!planSet?.source_s3_key) return notFound("Plan PDF not found");

    const fileName = planSet.original_file_name || `${planSet.title || "site-walk-plan"}.pdf`;
    const contentType = planSet.mime_type?.includes("pdf") ? planSet.mime_type : "application/pdf";

    try {
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: planSet.source_s3_key,
          ResponseContentDisposition: `inline; filename="${encodeURIComponent(fileName)}"`,
          ResponseContentType: contentType,
        }),
        { expiresIn: 3600 },
      );
      return NextResponse.redirect(url);
    } catch (error) {
      return serverError(error instanceof Error ? error.message : "Failed to load plan PDF");
    }
  });
