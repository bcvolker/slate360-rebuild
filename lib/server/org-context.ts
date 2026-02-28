import "server-only";

import type { User } from "@supabase/supabase-js";
import type { Tier } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

type MembershipRow = {
  org_id?: string | null;
  role?: string | null;
  created_at?: string | null;
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
};

export async function resolveServerOrgContext(): Promise<ServerOrgContext> {
  const supabase = await createClient();
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
    };
  }

  const isSlateCeo = user.email === "slate360ceo@gmail.com";

  try {
    const { data } = await supabase
      .from("organization_members")
      .select("org_id, role, created_at, organizations(id,name,tier)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

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
      };
    }

    const selected = [...rows].sort((a, b) => roleRank(a.role) - roleRank(b.role))[0];
    const orgRaw = selected.organizations;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
    const role = selected.role ?? null;
    const isAdmin = role === "owner" || role === "admin";

    return {
      user,
      tier: toTier(org?.tier),
      orgId: selected.org_id ?? org?.id ?? null,
      orgName: org?.name ?? null,
      role,
      isAdmin,
      isSlateCeo,
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
    };
  }
}
