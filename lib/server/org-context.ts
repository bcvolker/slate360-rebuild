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

function toTier(value?: string | null): Tier {
  if (value === "trial" || value === "creator" || value === "model" || value === "business" || value === "enterprise") {
    return value;
  }
  return "trial";
}

function roleRank(role?: string | null): number {
  const normalized = (role ?? "").toLowerCase();
  if (normalized === "owner") return 0;
  if (normalized === "admin") return 1;
  return 2;
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
  /**
   * Combined flag: isSlateCeo || isSlateStaff.
   * Use this everywhere you need to gate visibility of CEO/internal-only tabs
   * (CEO Command Center, Market Robot, Athlete360).
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
      hasInternalAccess: false,
    };
  }

  const isSlateCeo = user.email === "slate360ceo@gmail.com";

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
        isSlateStaff: false,
        hasInternalAccess: isSlateCeo,
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
      isSlateStaff: false,
      hasInternalAccess: isSlateCeo,
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
      isSlateStaff: false,
      hasInternalAccess: isSlateCeo,
    };
  }
}
