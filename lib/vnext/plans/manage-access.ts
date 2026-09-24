import "server-only";

/** Matches public.user_can_manage_project. Collaborator and viewer are not writers. */
const MANAGE_ROLES = new Set(["owner", "admin", "member", "manager"]);

type RoleRow = { role?: string | null; role_id?: string | null };

type RoleQuery = {
  eq: (column: string, value: string) => RoleQuery;
  maybeSingle: () => Promise<{ data: RoleRow | null; error: { message: string } | null }>;
};

type Admin = {
  from: (table: string) => {
    select: (columns: string) => unknown;
  };
};

function roles(admin: Admin, table: string, columns: string): RoleQuery {
  return (admin.from(table) as { select: (columns: string) => RoleQuery }).select(columns);
}

export function isProjectManageRole(role: string | null | undefined): boolean {
  return MANAGE_ROLES.has((role ?? "").trim().toLowerCase());
}

function roleOf(row: RoleRow | null): string | null {
  const role = row?.role ?? row?.role_id ?? null;
  return typeof role === "string" && role.trim() ? role : null;
}

/**
 * Write access for project plans.
 * Organization role on the project's org wins, matching user_project_role.
 * Otherwise the project_members role is used. role and role_id are both read
 * because membership writes have used either column. A missing or unknown role
 * cannot upload.
 */
export async function userCanManageVnextProject(
  admin: Admin,
  userId: string,
  projectId: string,
  projectOrgId: string | null,
): Promise<boolean> {
  if (projectOrgId) {
    const { data, error } = await roles(admin, "organization_members", "role")
      .eq("org_id", projectOrgId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return false;
    const orgRole = roleOf(data);
    if (orgRole) return isProjectManageRole(orgRole);
  }

  const { data, error } = await roles(admin, "project_members", "role, role_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return isProjectManageRole(roleOf(data));
}
