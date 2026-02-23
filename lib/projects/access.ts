import { createAdminClient } from "@/lib/supabase/admin";

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

function withProjectScope<T extends { eq: Function; or: Function }>(query: T, orgId: string | null, userId: string): T {
  if (orgId) {
    return query.or(`org_id.eq.${orgId},created_by.eq.${userId}`) as T;
  }

  return query.eq("created_by", userId) as T;
}

export async function listScopedProjectsForUser(userId: string) {
  const { admin, orgId } = await resolveProjectScope(userId);

  let query = admin
    .from("projects")
    .select("id, name, description, metadata, status, created_by, created_at, org_id")
    .order("created_at", { ascending: false });

  query = withProjectScope(query, orgId, userId);

  const { data, error } = await query;

  return { admin, orgId, projects: data ?? [], error };
}

export async function getScopedProjectForUser(userId: string, projectId: string, selectClause: string) {
  const { admin, orgId } = await resolveProjectScope(userId);

  let query = admin
    .from("projects")
    .select(selectClause)
    .eq("id", projectId)
    .limit(1);

  query = withProjectScope(query, orgId, userId);

  const { data, error } = await query.single();
  return { admin, orgId, project: data, error };
}
