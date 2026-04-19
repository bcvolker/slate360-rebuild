import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProjectMemberRow = {
  user_id: string;
  role: string;
  email: string | null;
  full_name: string | null;
};

export type PendingInviteRow = {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
  channel: string;
  status: "pending";
  created_at: string;
  last_sent_at: string | null;
  send_count: number;
};

export type LeadershipViewerRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
};

export type ProjectPeoplePayload = {
  members: ProjectMemberRow[];
  pendingInvites: PendingInviteRow[];
  leadershipViewers: LeadershipViewerRow[];
};

async function hydrateUsers(
  admin: SupabaseClient,
  userIds: string[],
): Promise<Map<string, { email: string | null; full_name: string | null }>> {
  const map = new Map<string, { email: string | null; full_name: string | null }>();
  if (userIds.length === 0) return map;

  // profiles is the joinable mirror of auth.users in this codebase.
  const { data } = await admin
    .from("profiles")
    .select("id, email, full_name, display_name")
    .in("id", userIds);

  for (const row of (data ?? []) as Array<{
    id: string;
    email: string | null;
    full_name: string | null;
    display_name: string | null;
  }>) {
    map.set(row.id, {
      email: row.email ?? null,
      full_name: row.full_name ?? row.display_name ?? null,
    });
  }
  return map;
}

export async function loadProjectPeople(
  projectId: string,
  orgId: string | null,
): Promise<ProjectPeoplePayload> {
  const admin = createAdminClient();

  const [{ data: memberRows }, { data: inviteRows }, { data: viewerRows }] = await Promise.all([
    admin
      .from("project_members")
      .select("user_id, role")
      .eq("project_id", projectId),
    admin
      .from("project_collaborator_invites")
      .select("id, email, phone, role, channel, status, created_at, last_sent_at, send_count")
      .eq("project_id", projectId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    orgId
      ? admin
          .from("organization_members")
          .select("user_id")
          .eq("org_id", orgId)
          .eq("role", "viewer")
      : Promise.resolve({ data: [] as Array<{ user_id: string }> }),
  ]);

  const memberIds = ((memberRows ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);
  const viewerIds = ((viewerRows ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);
  const profiles = await hydrateUsers(admin, [...new Set([...memberIds, ...viewerIds])]);

  const members: ProjectMemberRow[] = ((memberRows ?? []) as Array<{
    user_id: string;
    role: string;
  }>).map((row) => {
    const p = profiles.get(row.user_id);
    return {
      user_id: row.user_id,
      role: row.role,
      email: p?.email ?? null,
      full_name: p?.full_name ?? null,
    };
  });

  const leadershipViewers: LeadershipViewerRow[] = viewerIds.map((id) => {
    const p = profiles.get(id);
    return { user_id: id, email: p?.email ?? null, full_name: p?.full_name ?? null };
  });

  return {
    members,
    pendingInvites: (inviteRows ?? []) as PendingInviteRow[],
    leadershipViewers,
  };
}
