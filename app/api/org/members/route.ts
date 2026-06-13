import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, forbidden } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEntitlements } from "@/lib/entitlements";
import { resolveServerOrgContext } from "@/lib/server/org-context";

type MemberRow = {
  user_id: string | null;
  role: string | null;
  joined_at: string | null;
  status: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
};

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ user }) => {
    const ctx = await resolveServerOrgContext();
    if (!ctx.orgId) {
      return ok({ members: [], seatCount: 0, maxSeats: 0 });
    }

    const admin = createAdminClient();
    const ent = getEntitlements(ctx.tier, { isSlateCeo: ctx.isSlateCeo });

    const { data: memberRows, error } = await admin
      .from("organization_members")
      .select("user_id, role, joined_at, status")
      .eq("org_id", ctx.orgId)
      .is("deactivated_at", null)
      .order("joined_at", { ascending: true });

    if (error) return forbidden("Could not load team members");

    const rows = (memberRows ?? []) as MemberRow[];
    const userIds = rows.map((row) => row.user_id).filter(Boolean) as string[];

    let profileMap = new Map<string, ProfileRow>();
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, email, display_name, avatar_url, updated_at")
        .in("id", userIds);
      profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile as ProfileRow]));
    }

    const members = rows
      .filter((row) => row.user_id)
      .map((row) => {
        const uid = row.user_id as string;
        const profile = profileMap.get(uid);
        const isSelf = uid === user.id;
        return {
          userId: uid,
          name:
            profile?.display_name?.trim() ||
            (isSelf ? "You" : profile?.email?.split("@")[0] ?? "Member"),
          email: profile?.email ?? (isSelf ? user.email ?? "" : ""),
          role: row.role ?? "member",
          avatarUrl: profile?.avatar_url ?? null,
          lastActive: profile?.updated_at ?? row.joined_at,
          isSelf,
        };
      });

    return ok({
      members,
      seatCount: members.length,
      maxSeats: ent.maxSeats,
    });
  });
