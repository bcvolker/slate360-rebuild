/**
 * GET /api/vnext/projects/[projectId]/items/[itemId]/image — vNext-scoped mirror of
 * /api/site-walk/items/[id]/image, used by the authenticated client Explore 360 viewer.
 *
 * The legacy route gates on the punchwalk standalone-app entitlement (via withAppAuth) and matches
 * the item's org_id against the signed-in user's single org — neither of which reflects the vNext
 * project-access contract (org OR creator OR project_members), so a legitimate cross-org
 * project_members collaborator with real Explore access could be refused this image. This route
 * instead uses withProjectAuth (getScopedProjectForUser's exact contract) and then verifies the
 * item actually belongs to that already-authorized project — no standalone-app entitlement, no
 * org-only check, and no way for an item id from a different project to be requested through it.
 */
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { notFound, serverError } from "@/lib/server/api-response";
import { BUCKET, s3 } from "@/lib/s3";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";
import { projectIncludesCapability } from "@/lib/vnext/scope/read-project-scope";
import { clientMayReadSource } from "@/lib/vnext/release/source-visible";

type Params = { params: Promise<{ projectId: string; itemId: string }> };

export function GET(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, projectId, user }) => {
    const { itemId } = await ctx.params;

    let itemQuery = admin
      .from("site_walk_items")
      .select("s3_key, item_type, title")
      .eq("id", itemId)
      .eq("project_id", projectId);
    itemQuery = excludeDeletedSiteWalkItems(itemQuery);

    const { data: item, error } = await itemQuery.maybeSingle();
    if (error) return serverError(error.message);
    if (!item?.s3_key) return notFound("Item image not found");
    const capability = item.item_type === "photo_360" ? "pano360" : "items";
    if (!(await projectIncludesCapability(admin, projectId, capability))) return notFound();
    if (item.item_type === "photo_360" && !(await clientMayReadSource(admin, projectId, "pano360", itemId, user.email))) return notFound();

    const ext = item.s3_key.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileName = `${item.title || `site-walk-${itemId}`}.${ext}`;
    const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: item.s3_key,
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
}
