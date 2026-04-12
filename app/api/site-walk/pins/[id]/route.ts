/**
 * DELETE /api/site-walk/pins/[id] — remove a pin from a plan
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";

export const DELETE = (req: NextRequest, ctx: IdRouteContext) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { error } = await admin
      .from("site_walk_pins")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) return serverError(error.message);
    return ok({ deleted: true });
  });
