/**
 * DELETE /api/site-walk/comments/[id]  — delete a comment (author only)
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";

export const DELETE = (req: NextRequest, ctx: IdRouteContext) =>
  withAuth(req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data, error } = await admin
      .from("site_walk_comments")
      .delete()
      .eq("id", id)
      .eq("author_id", user.id)
      .select("id")
      .single();

    if (error) return serverError(error.message);
    if (!data) return notFound("Comment not found or not yours");
    return ok({ deleted: true });
  });
