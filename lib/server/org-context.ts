import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import type { Tier } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail, checkBetaApproved } from "@/lib/server/beta-access";

type MembershipRow = {
  org_id?: string | null;
  role?: string | null;
  permissions?: Record<string, unknown> | null;
  organizations?:
    | { id?: string | null; name?: string | null; tier?: string | null }
    | Array<{ id?: string | null; name?: string | null; tier?: string | null }>
    | null;
};

export const PERMISSION_KEYS = [
  "canViewBilling",
  "canViewOrgDataUsage",
  "canViewAuditLog",
  "canInviteMembers",
  "canChangeOrgSettings",
  "canPublishToClients",
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export type MemberPermissions = Record<PermissionKey, boolean>;

function resolvePermissions(
  raw: Record<string, unknown> | null | undefined,
  tier: Tier,
  isAdmin: boolean,
): MemberPermissions {
  // Outside enterprise, role + isAdmin remain authoritative — admins get
  // everything, non-admins get nothing.
  if (tier !== "enterprise") {
    const fallback = isAdmin;
    return PERMISSION_KEYS.reduce((acc, key) => {
      acc[key] = fallback;
      return acc;
    }, {} as MemberPermissions);
  }
  return PERMISSION_KEYS.reduce((acc, key) => {
    const value = raw?.[key];
    acc[key] = typeof value === "boolean" ? value : isAdmin;
    return acc;
  }, {} as MemberPermissions);
}

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
  if (normalized === "member") return 2;
  if (normalized === "viewer") return 3;
  return 4;
}

function resolveInternalAccess(isSlateCeo: boolean, isSlateStaff: boolean) {
  const hasInternalAccess = isSlateCeo || isSlateStaff;
  return {
    canAccessOperationsConsole: hasInternalAccess,
    hasInternalAccess,
  };
}

export type ServerOrgContext = {
  user: User | null;
  tier: Tier;
  orgId: string | null;
  orgName: string | null;
  role: string | null;
  isAdmin: boolean;
  /** True when role === "viewer" — read-only access (e.g. ASU directors observing beta-tester PMs). */
  isViewer: boolean;
  /** True when role allows mutating org-scoped resources (anyone except viewer). */
  canEditOrg: boolean;
  isSlateCeo: boolean;
  /** True when the user's email is in the slate360_staff table (granted by CEO). */
  isSlateStaff: boolean;
  canAccessOperationsConsole: boolean;
  hasInternalAccess: boolean;
  /** Derived from profiles.is_beta_approved (or owner email bypass). */
  isBetaApproved: boolean;
  /** Convenience alias — currently equals canAccessOperationsConsole. */
  hasOperationsConsoleAccess: boolean;
  /** Resolved per-feature permissions. Enterprise reads from organization_members.permissions; other tiers fall back to isAdmin. */
  permissions: MemberPermissions;
};

/**
 * React `cache()`-wrapped so the full context resolution runs at most
 * once per server request, even when both a layout and a nested page
 * call it.
 */
export const resolveServerOrgContext = cache(async (): Promise<ServerOrgContext> => {
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
      isViewer: false,
      canEditOrg: false,
      isSlateCeo: false,
      isSlateStaff: false,
      canAccessOperationsConsole: false,
      hasInternalAccess: false,
      isBetaApproved: false,
      hasOperationsConsoleAccess: false,
      permissions: resolvePermissions(null, "trial", false),
    };
  }

  const isSlateCeo = isOwnerEmail(user.email);

  // Check slate360_staff table for internal access grants
  let isSlateStaffResolved = false;
  if (!isSlateCeo && user.email) {
    try {
      const { data: staffRow } = await admin
        .from("slate360_staff")
        .select("id")
        .eq("email", user.email.toLowerCase())
        .is("revoked_at", null)
        .maybeSingle();

      isSlateStaffResolved = !!staffRow;
    } catch {
      // Table may not exist yet — fail gracefully
      isSlateStaffResolved = false;
    }
  }

  const internalAccess = resolveInternalAccess(isSlateCeo, isSlateStaffResolved);

  // Resolve beta approval (owner auto-approved, others checked from profiles)
  const isBetaApproved = isSlateCeo || (await checkBetaApproved(user.id));

  try {
    const { data } = await admin
      .from("organization_members")
      .select("org_id, role, permissions, organizations(id,name,tier)")
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
        isViewer: false,
        canEditOrg: false,
        isSlateCeo,
        isSlateStaff: isSlateStaffResolved,
        ...internalAccess,
        isBetaApproved,
        hasOperationsConsoleAccess: internalAccess.canAccessOperationsConsole,
        permissions: resolvePermissions(null, "trial", false),
      };
    }

    const selected = [...rows].sort((a, b) => roleRank(a.role) - roleRank(b.role))[0];
    const orgRaw = selected.organizations;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
    const orgId = selected.org_id ?? org?.id ?? null;
    const role = selected.role ?? null;
    const normalizedRole = (role ?? "").toLowerCase();
    const isAdmin = normalizedRole === "owner" || normalizedRole === "admin";
    const isViewer = normalizedRole === "viewer";
    const canEditOrg = !isViewer && !!normalizedRole;

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
      isViewer,
      canEditOrg,
      isSlateCeo,
      isSlateStaff: isSlateStaffResolved,
      ...internalAccess,
      isBetaApproved,
      hasOperationsConsoleAccess: internalAccess.canAccessOperationsConsole,
      permissions: resolvePermissions(
        (selected.permissions ?? null) as Record<string, unknown> | null,
        toTier(resolvedTier),
        isAdmin,
      ),
    };
  } catch {
    return {
      user,
      tier: "trial",
      orgId: null,
      orgName: null,
      role: null,
      isAdmin: false,
      isViewer: false,
      canEditOrg: false,
      isSlateCeo,
      isSlateStaff: isSlateStaffResolved,
      ...internalAccess,
      isBetaApproved,
      hasOperationsConsoleAccess: internalAccess.canAccessOperationsConsole,
      permissions: resolvePermissions(null, "trial", false),
    };
  }
});
