import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export async function projectInOrg(admin: Admin, orgId: string, projectId: string): Promise<boolean> {
  const { data } = await admin.from("projects").select("id").eq("id", projectId).eq("org_id", orgId).maybeSingle();
  return Boolean(data);
}

export type VisitRow = {
  id: string;
  route_id: string | null;
  client_published_at: string | null;
  project_id: string | null;
};

/** A visit (walkthrough) that belongs to this project and org. */
export async function loadVisit(admin: Admin, orgId: string, projectId: string, walkthroughId: string): Promise<VisitRow | null> {
  const { data } = await admin
    .from("spatial_walkthroughs")
    .select("id, route_id, client_published_at, project_id")
    .eq("id", walkthroughId)
    .eq("org_id", orgId)
    .eq("project_id", projectId)
    .maybeSingle();
  return (data as VisitRow | null) ?? null;
}

export const PUBLISHED_LOCK = "Unpublish this visit before changing its checkpoints.";
