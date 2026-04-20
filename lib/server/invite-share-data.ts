/**
 * Build the data payload for the global Invite & Share modal.
 *
 * Server-side only — fetches:
 *   - beta seats claimed (count of profiles.beta_tester=true)
 *   - org projects (id + name) the user can invite collaborators to
 *   - org members (as contact suggestions in the email datalist)
 */
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { BETA_TESTER_CAP } from "@/lib/beta-mode";
import type { InviteShareData } from "@/lib/types/invite";

export async function buildInviteShareData(
  user: User,
  orgId: string | null,
): Promise<InviteShareData> {
  const admin = createAdminClient();

  const userName =
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "";

  const empty: InviteShareData = {
    userId: user.id,
    userName,
    beta: { seatsClaimed: 0, cap: BETA_TESTER_CAP },
    projects: [],
    contacts: [],
  };

  // Beta seats claimed
  let seatsClaimed = 0;
  const { count, error: countErr } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("beta_tester", true);
  if (!countErr && typeof count === "number") {
    seatsClaimed = count;
  }

  if (!orgId) {
    return { ...empty, beta: { seatsClaimed, cap: BETA_TESTER_CAP } };
  }

  // Projects in this org
  const { data: projectsRows } = await admin
    .from("projects")
    .select("id, name")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  const projects = (projectsRows ?? [])
    .filter((p): p is { id: string; name: string } =>
      typeof p?.id === "string" && typeof p?.name === "string",
    )
    .map((p) => ({ id: p.id, name: p.name }));

  // Org member contact suggestions
  interface MemberRow {
    user_id: string;
    profiles:
      | { id: string; email: string | null; full_name: string | null }
      | { id: string; email: string | null; full_name: string | null }[]
      | null;
  }

  const { data: memberRows } = await admin
    .from("organization_members")
    .select("user_id, profiles!inner(id, email, full_name)")
    .eq("org_id", orgId)
    .limit(200);

  const contacts = ((memberRows ?? []) as MemberRow[]).flatMap((m) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    if (!p?.email) return [];
    return [{ id: p.id, email: p.email, fullName: p.full_name }];
  });

  return {
    userId: user.id,
    userName,
    beta: { seatsClaimed, cap: BETA_TESTER_CAP },
    projects,
    contacts,
  };
}
