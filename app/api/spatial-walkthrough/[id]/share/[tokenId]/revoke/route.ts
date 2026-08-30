import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, unauthorized, notFound, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string; tokenId: string }> };

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id, tokenId } = await ctx.params;
    const { data, error } = await admin
      .from("spatial_share_tokens")
      .update({ is_revoked: true })
      .eq("id", tokenId)
      .eq("walkthrough_id", id)
      .eq("org_id", orgId)
      .select("id, is_revoked")
      .maybeSingle();
    if (error) return serverError(error.message);
    if (!data) return notFound("Share not found");
    return ok({ share: data });
  }, "author");
