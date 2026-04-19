import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getEntitlements, type Tier } from "@/lib/entitlements";

export class CollaboratorLimitError extends Error {
  readonly code = "collaborator_limit_reached" as const;
  constructor(public readonly used: number, public readonly limit: number) {
    super(`Collaborator limit reached (${used}/${limit})`);
  }
}

/**
 * Counts active collaborators for a subscriber. "Active" = currently in
 * project_members with role='collaborator' OR has a pending invite, scoped
 * to projects this subscriber owns (created_by = userId).
 */
export async function countActiveCollaborators(userId: string): Promise<number> {
  const admin = createAdminClient();

  // Projects owned by this subscriber.
  const { data: ownedProjects } = await admin
    .from("projects")
    .select("id")
    .eq("created_by", userId);

  const projectIds = (ownedProjects ?? []).map((row) => row.id as string);
  if (projectIds.length === 0) return 0;

  const [{ data: memberRows }, { data: pendingRows }] = await Promise.all([
    admin
      .from("project_members")
      .select("user_id, project_id")
      .in("project_id", projectIds)
      .eq("role", "collaborator"),
    admin
      .from("project_collaborator_invites")
      .select("id, email, phone")
      .in("project_id", projectIds)
      .eq("status", "pending"),
  ]);

  // Distinct collaborators by user_id (a collaborator on multiple projects
  // counts once against the seat limit).
  const memberUserIds = new Set<string>();
  for (const row of memberRows ?? []) {
    if (row.user_id) memberUserIds.add(row.user_id as string);
  }

  // Distinct pending invites by lower(email) || phone — same logic.
  const pendingKeys = new Set<string>();
  for (const row of pendingRows ?? []) {
    const key =
      (typeof row.email === "string" && row.email.trim()
        ? `e:${row.email.toLowerCase()}`
        : null) ??
      (typeof row.phone === "string" && row.phone.trim()
        ? `p:${row.phone}`
        : `i:${row.id as string}`);
    pendingKeys.add(key);
  }

  return memberUserIds.size + pendingKeys.size;
}

/** Throws CollaboratorLimitError when the subscriber is at or above their cap. */
export async function assertCanInviteCollaborator(
  userId: string,
  tier: Tier,
): Promise<void> {
  const { maxCollaborators } = getEntitlements(tier);

  if (maxCollaborators <= 0) {
    throw new CollaboratorLimitError(0, 0);
  }
  if (!Number.isFinite(maxCollaborators)) {
    return; // enterprise = unlimited
  }

  const used = await countActiveCollaborators(userId);
  if (used >= maxCollaborators) {
    throw new CollaboratorLimitError(used, maxCollaborators);
  }
}
