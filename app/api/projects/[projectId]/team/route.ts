import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getScopedProjectForUser } from "@/lib/projects/access";

type Params = { projectId: string };

/**
 * Unified roster entry. Source tells the UI which table the row came from
 * so it can render different affordances (e.g. "Resend invite" only for
 * pending rows). All shapes converge on a single display contract.
 */
type TeamMember = {
  id: string;
  source: "member" | "stakeholder" | "invite";
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string;
  status: string;
  avatar_url: string | null;
  user_id: string | null;
  created_at: string | null;
};

type MemberRow = { user_id: string; role: string };
type StakeholderRow = {
  id: string;
  name: string;
  role: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
};
type InviteRow = {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  channel: string;
  created_at: string;
};
type ProfileRow = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  title: string | null;
  phone: string | null;
};
type AuthUserRow = { id: string; email: string | null };

/**
 * GET /api/projects/[projectId]/team
 *
 * Aggregates three sources into a single ordered roster:
 *   1. project_members            -> internal Slate360 users (auth.users)
 *   2. project_stakeholders       -> external parties (no auth)
 *   3. project_collaborator_invites (status='pending') -> outstanding invites
 *
 * Returns: { team: TeamMember[] }
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const { projectId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();

  const [membersRes, stakeholdersRes, invitesRes] = await Promise.all([
    admin.from("project_members")
      .select("user_id, role")
      .eq("project_id", projectId),
    admin.from("project_stakeholders")
      .select("id, name, role, company, email, phone, status, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    admin.from("project_collaborator_invites")
      .select("id, email, phone, role, status, channel, created_at")
      .eq("project_id", projectId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  if (membersRes.error)      return NextResponse.json({ error: membersRes.error.message },      { status: 500 });
  if (stakeholdersRes.error) return NextResponse.json({ error: stakeholdersRes.error.message }, { status: 500 });
  if (invitesRes.error)      return NextResponse.json({ error: invitesRes.error.message },      { status: 500 });

  const memberRows      = (membersRes.data      ?? []) as MemberRow[];
  const stakeholderRows = (stakeholdersRes.data ?? []) as StakeholderRow[];
  const inviteRows      = (invitesRes.data      ?? []) as InviteRow[];

  const userIds = memberRows.map((m) => m.user_id);

  let profilesById = new Map<string, ProfileRow>();
  let emailsById   = new Map<string, string | null>();

  if (userIds.length > 0) {
    const profilesRes = await admin
      .from("user_profiles")
      .select("user_id, full_name, avatar_url, title, phone")
      .in("user_id", userIds);
    if (!profilesRes.error && profilesRes.data) {
      profilesById = new Map((profilesRes.data as ProfileRow[]).map((p) => [p.user_id, p]));
    }

    // Best-effort email lookup. Failures are non-fatal — the roster still renders.
    try {
      const authRes = await admin
        .from("auth_users_view" as never)
        .select("id, email")
        .in("id", userIds);
      const rows = (authRes.data ?? []) as AuthUserRow[];
      emailsById = new Map(rows.map((r) => [r.id, r.email]));
    } catch {
      // view may not exist in all environments; skip silently
    }
  }

  const members: TeamMember[] = memberRows.map((m) => {
    const profile = profilesById.get(m.user_id);
    return {
      id: `member:${m.user_id}`,
      source: "member",
      name: profile?.full_name ?? "Slate360 user",
      email: emailsById.get(m.user_id) ?? null,
      phone: profile?.phone ?? null,
      company: profile?.title ?? null,
      role: m.role,
      status: "Active",
      avatar_url: profile?.avatar_url ?? null,
      user_id: m.user_id,
      created_at: null,
    };
  });

  const stakeholders: TeamMember[] = stakeholderRows.map((s) => ({
    id: `stakeholder:${s.id}`,
    source: "stakeholder",
    name: s.name,
    email: s.email,
    phone: s.phone,
    company: s.company,
    role: s.role,
    status: s.status,
    avatar_url: null,
    user_id: null,
    created_at: s.created_at,
  }));

  const invites: TeamMember[] = inviteRows.map((i) => ({
    id: `invite:${i.id}`,
    source: "invite",
    name: i.email ?? i.phone ?? "Pending invite",
    email: i.email,
    phone: i.phone,
    company: null,
    role: i.role,
    status: `Pending (${i.channel})`,
    avatar_url: null,
    user_id: null,
    created_at: i.created_at,
  }));

  // Order: internal members first (most relevant), then external stakeholders,
  // then pending invites at the bottom of the list.
  const team: TeamMember[] = [...members, ...stakeholders, ...invites];

  return NextResponse.json({ team });
}
