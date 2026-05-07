/**
 * GET /api/site-walk/items/[id]/comparison
 *
 * Returns a before/after pair for the requested item.
 *  - If the item has before_item_id, that is the "before" and this is the "after".
 *  - Otherwise we look for the most recent child whose before_item_id = this id;
 *    in that case this is the "before" and the child is the "after".
 *
 * Response: { before: SiteWalkItem | null, after: SiteWalkItem | null }
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data: anchor, error: anchorError } = await admin
      .from("site_walk_items")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();

    if (anchorError) return serverError(anchorError.message);
    if (!anchor) return notFound("Item not found");

    let before = null;
    let after = null;

    if (anchor.before_item_id) {
      after = anchor;
      const { data: parent } = await admin
        .from("site_walk_items")
        .select("*")
        .eq("id", anchor.before_item_id)
        .eq("org_id", orgId)
        .maybeSingle();
      before = parent ?? null;
    } else {
      before = anchor;
      const { data: child } = await admin
        .from("site_walk_items")
        .select("*")
        .eq("before_item_id", anchor.id)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      after = child ?? null;
    }

    return ok({ before, after });
  });
