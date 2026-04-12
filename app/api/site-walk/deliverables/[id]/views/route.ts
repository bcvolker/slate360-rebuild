/**
 * GET /api/site-walk/deliverables/[id]/views — view analytics for a deliverable
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    // Verify ownership
    const { data: del } = await admin
      .from("site_walk_deliverables")
      .select("id, share_view_count")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (!del) return notFound("Deliverable not found");

    const { data: views, error } = await admin
      .from("site_walk_deliverable_views")
      .select("id, viewer_ip, viewer_ua, viewed_at")
      .eq("deliverable_id", id)
      .order("viewed_at", { ascending: false })
      .limit(100);

    if (error) return serverError(error.message);
    return ok({
      total_views: del.share_view_count,
      recent_views: views ?? [],
    });
  });
