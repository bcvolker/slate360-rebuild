import "server-only";

import type { User } from "@supabase/supabase-js";
import type { Tier } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type MembershipRow = {
  org_id?: string | null;
  role?: string | null;
  organizations?:
    | { id?: string | null; name?: string | null; tier?: string | null }
    | Array<{ id?: string | null; name?: string | null; tier?: string | null }>
    | null;
};

const INTERNAL_TABS = ["ceo", "market", "athlete360"] as const;

type InternalTabId = (typeof INTERNAL_TABS)[number];

type StaffAccessRow = {
  id?: string | null;
  access_scope?: string[] | null;
};

function toTier(value?: string | null): Tier {
  if (value === "trial" || value === "standard" || value === "business" || value === "enterprise") {
    return value;
  }
  // Backward-compat: map legacy tier names
  if (value === "creator" || value === "model") return "standard";
  return "trial";
}

function roleRank(role?: string | null): number {
  const normalized = (role ?? "").toLowerCase();
  if (normalized === "owner") return 0;
  if (normalized === "admin") return 1;
  return 2;
}

function resolveInternalAccess(isSlateCeo: boolean, scopes: string[]) {
  const normalizedScopes = isSlateCeo
    ? (["market", "athlete360"] as InternalTabId[])
    : (["market", "athlete360"] as const).filter((scope) => scopes.includes(scope));

  return {
    internalAccessScopes: normalizedScopes,
    canAccessCeo: isSlateCeo,
    canAccessMarket: normalizedScopes.includes("market"),
    canAccessAthlete360: normalizedScopes.includes("athlete360"),
    hasInternalAccess: isSlateCeo || normalizedScopes.length > 0,
  };
}

export type ServerOrgContext = {
  user: User | null;
  tier: Tier;
  orgId: string | null;
  orgName: string | null;
  role: string | null;
  isAdmin: boolean;
  isSlateCeo: boolean;
  /** True when the user's email is in the slate360_staff table (granted by CEO). */
  isSlateStaff: boolean;
  internalAccessScopes: InternalTabId[];
  canAccessCeo: boolean;
  canAccessMarket: boolean;
  canAccessAthlete360: boolean;
  /**
    * Combined flag: isSlateCeo || isSlateStaff.
    * Use this for Market Robot and Athlete360 visibility.
    * CEO Command Center remains owner-only via canAccessCeo.
   * Do NOT use this for entitlements overrides — only isSlateCeo gets enterprise override.
   */
  hasInternalAccess: boolean;
};

export async function resolveServerOrgContext(): Promise<ServerOrgContext> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      tier: "trial",
      orgId: null,
      orgName: null,
      role: null,
      isAdmin: false,
      isSlateCeo: false,
      isSlateStaff: false,
      internalAccessScopes: [],
      canAccessCeo: false,
      canAccessMarket: false,
      canAccessAthlete360: false,
      hasInternalAccess: false,
    };
  }

  const isSlateCeo = user.email === "slate360ceo@gmail.com";

  // Check slate360_staff table for internal access grants
  let isSlateStaffResolved = false;
  let internalStaffScopes: string[] = [];
  if (!isSlateCeo && user.email) {
    try {
      const { data: staffRow } = await admin
        .from("slate360_staff")
        .select("id, access_scope")
        .eq("email", user.email.toLowerCase())
        .is("revoked_at", null)
        .maybeSingle();

      const resolvedRow = staffRow as StaffAccessRow | null;
      isSlateStaffResolved = !!resolvedRow;
      internalStaffScopes = Array.isArray(resolvedRow?.access_scope) && resolvedRow.access_scope.length > 0
        ? resolvedRow.access_scope.filter((scope) => scope === "market" || scope === "athlete360")
        : isSlateStaffResolved
          ? ["market"]
          : [];
    } catch {
      // Table may not exist yet — fail gracefully
      isSlateStaffResolved = false;
      internalStaffScopes = [];
    }
  }

  const internalAccess = resolveInternalAccess(isSlateCeo, internalStaffScopes);

  try {
    const { data } = await admin
      .from("organization_members")
      .select("org_id, role, organizations(id,name,tier)")
      .eq("user_id", user.id)
      .limit(25);

    const rows = Array.isArray(data) ? (data as MembershipRow[]) : [];

    if (rows.length === 0) {
      return {
        user,
        tier: "trial",
        orgId: null,
        orgName: null,
        role: null,
        isAdmin: false,
        isSlateCeo,
        isSlateStaff: isSlateStaffResolved,
        ...internalAccess,
      };
    }

    const selected = [...rows].sort((a, b) => roleRank(a.role) - roleRank(b.role))[0];
    const orgRaw = selected.organizations;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
    const orgId = selected.org_id ?? org?.id ?? null;
    const role = selected.role ?? null;
    const isAdmin = role === "owner" || role === "admin";

    let resolvedOrgName = org?.name ?? null;
    let resolvedTier = org?.tier ?? null;

    if ((!resolvedOrgName || !resolvedTier) && orgId) {
      const { data: orgRow } = await admin
        .from("organizations")
        .select("id,name,tier")
        .eq("id", orgId)
        .maybeSingle();

      resolvedOrgName = resolvedOrgName ?? orgRow?.name ?? null;
      resolvedTier = resolvedTier ?? orgRow?.tier ?? null;
    }

    return {
      user,
      tier: toTier(resolvedTier),
      orgId,
      orgName: resolvedOrgName,
      role,
      isAdmin,
      isSlateCeo,
      isSlateStaff: isSlateStaffResolved,
      ...internalAccess,
    };
  } catch {
    return {
      user,
      tier: "trial",
      orgId: null,
      orgName: null,
      role: null,
      isAdmin: false,
      isSlateCeo,
      isSlateStaff: isSlateStaffResolved,
      ...internalAccess,
    };
  }
}
