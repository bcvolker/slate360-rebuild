import { createAdminClient } from "@/lib/supabase/admin";

type ProjectListRow = {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
  created_by: string;
  created_at: string;
  org_id: string;
};

type ProjectScope = {
  admin: ReturnType<typeof createAdminClient>;
  orgId: string | null;
};

export async function resolveProjectScope(userId: string): Promise<ProjectScope> {
  const admin = createAdminClient();

  let orgId: string | null = null;
  try {
    const { data } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", userId)
      .maybeSingle();

    orgId = data?.org_id ?? null;
  } catch {
    orgId = null;
  }

  return { admin, orgId };
}

async function listProjectMembershipIds(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId);

  return Array.from(new Set((data ?? []).map((row) => String(row.project_id)).filter(Boolean)));
}

export async function listScopedProjectsForUser(userId: string) {
  const { admin, orgId } = await resolveProjectScope(userId);
  const membershipProjectIds = await listProjectMembershipIds(admin, userId);

  let query = admin
    .from("projects")
    .select("id, name, description, metadata, status, created_by, created_at, org_id")
    .order("created_at", { ascending: false });

  query = orgId
    ? query.or(`org_id.eq.${orgId},created_by.eq.${userId}`)
    : query.eq("created_by", userId);

  const { data, error } = await query;
  const merged = new Map<string, ProjectListRow>();

  for (const project of (data ?? []) as ProjectListRow[]) {
    if (project?.id) merged.set(project.id, project);
  }

  if (membershipProjectIds.length > 0) {
    const missingIds = membershipProjectIds.filter((projectId) => !merged.has(projectId));
    if (missingIds.length > 0) {
      const { data: memberProjects } = await admin
        .from("projects")
        .select("id, name, description, metadata, status, created_by, created_at, org_id")
        .in("id", missingIds)
        .order("created_at", { ascending: false });

      for (const project of (memberProjects ?? []) as ProjectListRow[]) {
        if (project?.id) merged.set(project.id, project);
      }
    }
  }

  return { admin, orgId, projects: Array.from(merged.values()), error };
}

export async function getScopedProjectForUser(userId: string, projectId: string, selectClause: string) {
  const { admin, orgId } = await resolveProjectScope(userId);

  const scopedQuery = admin
    .from("projects")
    .select(selectClause)
    .eq("id", projectId)
    .limit(1);

  const { data, error } = await (orgId
    ? scopedQuery.or(`org_id.eq.${orgId},created_by.eq.${userId}`).single()
    : scopedQuery.eq("created_by", userId).single());

  if (!error && data) {
    return { admin, orgId, project: data, error: null };
  }

  const { data: membership } = await admin
    .from("project_members")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return { admin, orgId, project: null, error };
  }

  const { data: memberProject, error: memberError } = await admin
    .from("projects")
    .select(selectClause)
    .eq("id", projectId)
    .single();

  return { admin, orgId, project: memberProject, error: memberError };
}
