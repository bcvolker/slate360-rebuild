import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type MobileHomeAssignment = {
  id: string;
  title: string;
  status: string;
  sessionId: string;
};

export async function loadMobileAssignments(
  orgId: string,
  userId: string,
  limit = 8,
): Promise<MobileHomeAssignment[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_walk_assignments")
    .select("id, title, status, session_id")
    .eq("org_id", orgId)
    .eq("assigned_to", userId)
    .neq("status", "done")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    sessionId: row.session_id,
  }));
}
