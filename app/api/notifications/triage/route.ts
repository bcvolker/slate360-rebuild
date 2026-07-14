import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

/**
 * POST /api/notifications/triage — personal flag/to-do state on a
 * notification, separate from is_read (see /api/notifications/read).
 * Always scoped to user_id so a user can only triage their own.
 *
 * Body: { id: string, flagged?: boolean, is_todo?: boolean }
 */
export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, user }) => {
    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      flagged?: boolean;
      is_todo?: boolean;
    };
    if (!body.id) return badRequest("id is required");

    const updates: Record<string, boolean> = {};
    if (body.flagged !== undefined) updates.flagged = body.flagged;
    if (body.is_todo !== undefined) updates.is_todo = body.is_todo;
    if (Object.keys(updates).length === 0) return badRequest("No valid fields to update");

    const { data, error } = await admin
      .from("project_notifications")
      .update(updates)
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) return serverError(error.message);
    return ok({ updated: Boolean(data) });
  });
