/**
 * DELETE /api/ceo/content/[assetId] — remove a marketing content asset.
 * Owner/CEO only.
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, serverError } from "@/lib/server/api-response";
import { isOwnerEmail } from "@/lib/server/beta-access";

type RouteContext = { params: Promise<{ assetId: string }> };

export const DELETE = (req: NextRequest, ctx: RouteContext) =>
  withAuth(req, async ({ user, admin }) => {
    if (!isOwnerEmail(user.email)) return forbidden("CEO access required");

    const { assetId } = await ctx.params;
    if (!assetId) return badRequest("assetId is required");

    const { error } = await admin.from("marketing_content_assets").delete().eq("id", assetId);
    if (error) return serverError(error.message);
    return ok({ deleted: true });
  });
