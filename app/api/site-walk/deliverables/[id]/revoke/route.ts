/**
 * POST /api/site-walk/deliverables/[id]/revoke — revoke share access
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data, error } = await admin
      .from("site_walk_deliverables")
      .update({ share_revoked: true, status: "submitted" })
      .eq("id", id)
      .eq("org_id", orgId)
      .select("id, share_revoked, status")
      .single();

    if (error) return serverError(error.message);
    if (!data) return notFound("Deliverable not found");
    return ok({ deliverable: data });
  });
