import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, serverError } from "@/lib/server/api-response";

/**
 * POST /api/notifications/read — mark notifications read for the current user.
 *
 * Body: { id?: string }  — mark one notification read.
 *       { all: true }    — mark all of the user's unread notifications read.
 * Always scoped to user_id so a user can only clear their own.
 */
export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, user }) => {
    const body = (await req.json().catch(() => ({}))) as { id?: string; all?: boolean };

    let query = admin
      .from("project_notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (!body.all) {
      if (!body.id) return ok({ updated: 0 });
      query = query.eq("id", body.id);
    }

    const { error, count } = await query.select("id", { count: "exact" });
    if (error) return serverError(error.message);

    return ok({ updated: count ?? 0 });
  });
