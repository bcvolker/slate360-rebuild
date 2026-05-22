/**
 * GET /api/site-walk/items/[id]/image — redirect to a presigned S3 URL for the
 * item's photo. Used by the markup + annotate views so we never need to load
 * S3 credentials in the browser.
 */
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { badRequest, notFound, serverError } from "@/lib/server/api-response";
import { getPhotoAngleById } from "@/lib/site-walk/photo-angles";
import { BUCKET, s3 } from "@/lib/s3";
import type { IdRouteContext } from "@/lib/types/api";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const { id } = await ctx.params;
    const angleId = req.nextUrl.searchParams.get("angle_id");
    let itemQuery = admin
      .from("site_walk_items")
      .select("s3_key, item_type, title, metadata")
      .eq("id", id)
      .eq("org_id", orgId);
    itemQuery = excludeDeletedSiteWalkItems(itemQuery);

    const { data: item, error } = await itemQuery.maybeSingle();

    if (error) return serverError(error.message);
    if (!item) return notFound("Item image not found");

    const angle = angleId ? getPhotoAngleById(item.metadata, angleId) : null;
    const s3Key = angleId ? angle?.s3Key : item.s3_key;
    if (!s3Key) return notFound(angleId ? "Angle image not found" : "Item image not found");

    const ext = s3Key.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileName = `${angle?.label || item.title || `site-walk-${id}`}.${ext}`;
    const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      ResponseContentDisposition: `inline; filename="${encodeURIComponent(fileName)}"`,
      ResponseContentType: contentType,
    });

    try {
      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
      return NextResponse.redirect(url);
    } catch (err) {
      return serverError(err instanceof Error ? err.message : "Failed to load image");
    }
  });
