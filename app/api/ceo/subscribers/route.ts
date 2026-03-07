import { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { withAuth } from "@/lib/server/api-auth";
import { forbidden, ok, serverError } from "@/lib/server/api-response";

type OrgRecord = {
  id?: string;
  name?: string;
  tier?: string;
};

type MembershipRow = {
  user_id: string;
  role?: string | null;
  organizations?: OrgRecord | OrgRecord[] | null;
};

type StaffGrantRow = {
  id: string;
  email: string;
  access_scope: string[] | null;
  revoked_at: string | null;
};

function isCeo(email: string | undefined): boolean {
  return email === "slate360ceo@gmail.com";
}

function normalizeEmail(email: string | undefined): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function getDisplayName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fullName = typeof meta?.full_name === "string" ? meta.full_name.trim() : "";
  if (fullName) return fullName;

  const email = normalizeEmail(user.email);
  return email ? email.split("@")[0] : "Unnamed user";
}

function pickPrimaryMembership(rows: MembershipRow[]): MembershipRow | null {
  if (rows.length === 0) return null;

  const rank = new Map<string, number>([
    ["owner", 3],
    ["admin", 2],
    ["project_manager", 1],
  ]);

  return [...rows].sort((left, right) => {
    const leftScore = rank.get(left.role ?? "") ?? 0;
    const rightScore = rank.get(right.role ?? "") ?? 0;
    return rightScore - leftScore;
  })[0] ?? null;
}

async function listAllUsers(admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>) {
  const users: User[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && users.length < 1000) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;

    const batch = data.users ?? [];
    users.push(...batch);
    hasMore = batch.length === 200;
    page += 1;
  }

  return users;
}

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ user, admin }) => {
    if (!isCeo(user.email)) return forbidden("CEO access required");

    try {
      const [users, membershipsResult, staffResult] = await Promise.all([
        listAllUsers(admin),
        admin
          .from("organization_members")
          .select("user_id, role, organizations(id,name,tier)"),
        admin
          .from("slate360_staff")
          .select("id, email, access_scope, revoked_at"),
      ]);

      if (membershipsResult.error) return serverError(membershipsResult.error.message);
      if (staffResult.error) return serverError(staffResult.error.message);

      const membersByUserId = new Map<string, MembershipRow[]>();
      for (const row of (membershipsResult.data ?? []) as MembershipRow[]) {
        const existing = membersByUserId.get(row.user_id) ?? [];
        existing.push(row);
        membersByUserId.set(row.user_id, existing);
      }

      const activeStaffByEmail = new Map<string, StaffGrantRow>();
      for (const row of (staffResult.data ?? []) as StaffGrantRow[]) {
        if (!row.revoked_at) {
          activeStaffByEmail.set(normalizeEmail(row.email), row);
        }
      }

      const subscribers = users
        .map((entry) => {
          const email = normalizeEmail(entry.email);
          const membership = pickPrimaryMembership(membersByUserId.get(entry.id) ?? []);
          const orgRaw = membership?.organizations;
          const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
          const staffGrant = activeStaffByEmail.get(email);
          const scopes = staffGrant?.access_scope ?? [];

          return {
            id: entry.id,
            email,
            displayName: getDisplayName(entry),
            orgId: org?.id ?? null,
            orgName: org?.name ?? "No organization",
            orgTier: org?.tier ?? "trial",
            orgRole: membership?.role ?? "member",
            createdAt: entry.created_at,
            isOwnerAccount: email === "slate360ceo@gmail.com",
            staffId: staffGrant?.id ?? null,
            accessScope: scopes,
            hasMarketAccess: scopes.includes("market"),
            hasAthlete360Access: scopes.includes("athlete360"),
          };
        })
        .filter((entry) => entry.email)
        .sort((left, right) => {
          if (left.hasMarketAccess !== right.hasMarketAccess) {
            return left.hasMarketAccess ? -1 : 1;
          }
          return left.displayName.localeCompare(right.displayName);
        });

      return ok({ subscribers });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load subscribers";
      return serverError(message);
    }
  });