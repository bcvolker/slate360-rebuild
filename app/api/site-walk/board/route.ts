/**
 * GET /api/site-walk/board — active sessions board for leadership
 *
 * Returns all non-archived sessions across all projects in the org,
 * with item counts and open assignment counts.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

export const GET = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    // Fetch active sessions with project name
    const { data: sessions, error: sessErr } = await admin
      .from("site_walk_sessions")
      .select("id, project_id, title, status, started_at, created_by, created_at")
      .eq("org_id", orgId)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(50);

    if (sessErr) return serverError(sessErr.message);
    if (!sessions || sessions.length === 0) return ok({ sessions: [] });

    // Get item counts per session
    const sessionIds = sessions.map((s) => s.id);

    const { data: itemCounts } = await admin
      .from("site_walk_items")
      .select("session_id")
      .in("session_id", sessionIds);

    const { data: assignmentCounts } = await admin
      .from("site_walk_assignments")
      .select("session_id, status")
      .in("session_id", sessionIds);

    const { data: escalations } = await admin
      .from("site_walk_comments")
      .select("session_id")
      .in("session_id", sessionIds)
      .eq("is_escalation", true);

    // Build lookup maps
    const itemCountMap = new Map<string, number>();
    for (const row of itemCounts ?? []) {
      itemCountMap.set(row.session_id, (itemCountMap.get(row.session_id) ?? 0) + 1);
    }

    const openAssignmentMap = new Map<string, number>();
    for (const row of assignmentCounts ?? []) {
      if (row.status !== "done" && row.status !== "rejected") {
        openAssignmentMap.set(row.session_id, (openAssignmentMap.get(row.session_id) ?? 0) + 1);
      }
    }

    const escalationMap = new Map<string, number>();
    for (const row of escalations ?? []) {
      escalationMap.set(row.session_id, (escalationMap.get(row.session_id) ?? 0) + 1);
    }

    const enriched = sessions.map((s) => ({
      ...s,
      item_count: itemCountMap.get(s.id) ?? 0,
      open_assignments: openAssignmentMap.get(s.id) ?? 0,
      escalation_count: escalationMap.get(s.id) ?? 0,
    }));

    return ok({ sessions: enriched });
  });
