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
    const { data: plan, error: planError } = await admin
      .from("site_walk_plans")
      .select("s3_key, file_id")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();

    if (planError) return serverError(planError.message);
    if (!plan?.s3_key) return notFound("Plan image not found");

    let fileName = `site-walk-plan-${id}.png`;
    let contentType: string | undefined;

    if (plan.file_id) {
      const { data: upload, error: uploadError } = await admin
        .from("slatedrop_uploads")
        .select("file_name, file_type")
        .eq("id", plan.file_id)
        .maybeSingle();

      if (uploadError) return serverError(uploadError.message);

      if (upload?.file_name) {
        fileName = upload.file_name;
      }

      if (upload?.file_type) {
        contentType = upload.file_type.includes("/")
          ? upload.file_type
          : `image/${upload.file_type}`;
      }
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: plan.s3_key,
      ResponseContentDisposition: `inline; filename="${encodeURIComponent(fileName)}"`,
      ...(contentType ? { ResponseContentType: contentType } : {}),
    });

    try {
      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
      return NextResponse.redirect(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load plan image";
      return serverError(message);
    }
  });