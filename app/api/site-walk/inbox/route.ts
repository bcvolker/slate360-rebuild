/**
 * GET /api/site-walk/inbox?projectId=...
 *
 * Returns open + in_progress items for the project, joined via session.
 * Used by the Field/Office Coordination Inbox.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

export const GET = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const projectId = new URL(req.url).searchParams.get("projectId");
    if (!projectId) return badRequest("projectId required");

    const { data, error } = await admin
      .from("site_walk_items")
      .select(
        "id, session_id, title, item_type, item_status, priority, before_item_id, item_relationship, created_at, site_walk_sessions!inner(project_id)"
      )
      .eq("org_id", orgId)
      .eq("site_walk_sessions.project_id", projectId)
      .in("item_status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return serverError(error.message);
    return ok({ items: data ?? [] });
  });
