/**
 * POST /api/site-walk/items/[id]/resolve — mark item as resolved
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data, error } = await admin
      .from("site_walk_items")
      .update({
        item_status: "resolved",
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("org_id", orgId)
      .in("item_status", ["open", "in_progress"])
      .select()
      .single();

    if (error) return serverError(error.message);
    if (!data) return notFound("Item not found or already resolved");
    return ok({ item: data });
  });
