import { NextRequest, NextResponse } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const getS3 = () =>
  new S3Client({
    region: process.env.R2_REGION ?? "us-east-1",
    endpoint:
      process.env.R2_ENDPOINT ??
      (process.env.CLOUDFLARE_ACCOUNT_ID
        ? `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : undefined),
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data: planSet, error } = await admin
      .from("site_walk_plan_sets")
      .select("id, org_id, source_s3_key, original_file_name, mime_type")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (error) return serverError(error.message);
    if (!planSet?.source_s3_key) return notFound("Plan set or source PDF not found");

    try {
      const s3 = getS3();
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET ?? "slate360-storage",
        Key: planSet.source_s3_key,
      });
      const result = await s3.send(command);
      if (!result.Body) return notFound("PDF data not found in storage");

      const contentType = planSet.mime_type ?? "application/pdf";
      const filename = planSet.original_file_name ?? "plan.pdf";

      // Stream the PDF body directly to the browser
      const stream = result.Body.transformToWebStream();
      return new NextResponse(stream, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
          "Cache-Control": "private, max-age=600",
        },
      });
    } catch (e) {
      console.error("[plan-pdf] R2 fetch error:", e);
      return serverError("Failed to retrieve PDF from storage");
    }
  });
