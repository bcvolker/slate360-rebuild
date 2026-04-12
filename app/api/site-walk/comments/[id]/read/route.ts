/**
 * POST /api/site-walk/comments/[id]/read  — mark comment as read by current user
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAuth(req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    // Fetch current read_by array
    const { data: existing, error: fetchErr } = await admin
      .from("site_walk_comments")
      .select("id, read_by")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (fetchErr || !existing) return notFound("Comment not found");

    const readBy: string[] = existing.read_by ?? [];
    if (readBy.includes(user.id)) {
      return ok({ already_read: true });
    }

    const { error } = await admin
      .from("site_walk_comments")
      .update({ read_by: [...readBy, user.id] })
      .eq("id", id);

    if (error) return serverError(error.message);
    return ok({ marked_read: true });
  });
