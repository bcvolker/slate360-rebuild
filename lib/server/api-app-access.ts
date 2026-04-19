import "server-only";

import type { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedContext } from "@/lib/server/api-auth";
import { forbidden } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";

export const APP_ACCESS_KEYS = [
  "site_walk",
  "tours",
  "design_studio",
  "content_studio",
] as const;
export type AppAccessKey = (typeof APP_ACCESS_KEYS)[number];

/**
 * Returns true when the user has been granted access to `appKey` in their org
 * via `org_member_app_access`. Org owners/admins implicitly pass — they're
 * the ones doing the granting.
 */
export async function userHasAppAccess(
  userId: string,
  orgId: string | null,
  appKey: AppAccessKey,
): Promise<boolean> {
  if (!orgId) return false;
  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .maybeSingle();

  const role = ((membership as { role?: string } | null)?.role ?? "").toLowerCase();
  if (role === "owner" || role === "admin") return true;

  const { data: grant } = await admin
    .from("org_member_app_access")
    .select("app_key")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .eq("app_key", appKey)
    .maybeSingle();

  return !!grant;
}

/**
 * Wrapper that enforces per-app seat assignment. Use when an API route is
 * scoped to one of the assignable apps (Site Walk, Tours, Design Studio,
 * Content Studio). Layered on top of org-level subscription gating.
 */
export async function withAppAccess(
  appKey: AppAccessKey,
  req: NextRequest,
  handler: (ctx: AuthedContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  return withAuth(req, async (ctx) => {
    const ok = await userHasAppAccess(ctx.user.id, ctx.orgId, appKey);
    if (!ok) {
      return forbidden(`No seat assigned for ${appKey}`);
    }
    return handler(ctx);
  });
}
