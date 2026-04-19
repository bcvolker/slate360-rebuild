import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * A user is a "trapped collaborator" if they have at least one
 * project_members row with role='collaborator' AND no organization_members
 * row at all (i.e. they joined via invite but never started their own
 * subscription / org).
 */
export async function isCollaboratorOnly(userId: string): Promise<boolean> {
  const admin = createAdminClient();

  const [{ data: orgRows }, { data: collabRows }] = await Promise.all([
    admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1),
    admin
      .from("project_members")
      .select("project_id")
      .eq("user_id", userId)
      .eq("role", "collaborator")
      .limit(1),
  ]);

  const hasOrg = (orgRows ?? []).length > 0;
  const hasCollabRow = (collabRows ?? []).length > 0;

  return !hasOrg && hasCollabRow;
}

/** Returns the projectIds where this user is a collaborator. */
export async function listCollaboratorProjects(userId: string): Promise<
  Array<{ project_id: string; name: string | null }>
> {
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId)
    .eq("role", "collaborator");

  const ids = ((rows ?? []) as Array<{ project_id: string }>).map((r) => r.project_id);
  if (ids.length === 0) return [];

  const { data: projects } = await admin
    .from("projects")
    .select("id, name")
    .in("id", ids);

  return ((projects ?? []) as Array<{ id: string; name: string | null }>).map((p) => ({
    project_id: p.id,
    name: p.name,
  }));
}
