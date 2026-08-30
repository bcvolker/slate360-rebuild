import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { withAuth, type AuthedContext } from "@/lib/server/api-auth";
import type { ClientSurfaceFlags } from "./client-surface";
import { loadClientSurfaceFlags } from "./purchased-flags";

export type SpatialAccess = {
  enabled: boolean;
  canAuthor: boolean;
  canView: boolean;
  isCeo: boolean;
};

export async function loadSpatialWalkthroughEnabled(orgId: string | null): Promise<boolean> {
  if (!orgId) return false;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("org_feature_flags")
      .select("standalone_spatial_walkthrough")
      .eq("org_id", orgId)
      .maybeSingle();
    return data?.standalone_spatial_walkthrough === true;
  } catch {
    return false;
  }
}

export async function resolveSpatialAccess(orgId: string | null, isCeo: boolean, isAdmin: boolean): Promise<SpatialAccess> {
  const enabled = isCeo || (await loadSpatialWalkthroughEnabled(orgId));
  return {
    enabled,
    canView: enabled,
    canAuthor: isCeo || (enabled && isAdmin),
    isCeo,
  };
}

export async function resolveClientSurfaceFlags(
  orgId: string | null,
  isCeo: boolean,
): Promise<ClientSurfaceFlags> {
  return loadClientSurfaceFlags(orgId, isCeo);
}

export async function withSpatialWalkthroughAuth(
  req: NextRequest,
  handler: (ctx: AuthedContext & { access: SpatialAccess }) => Promise<NextResponse>,
  mode: "view" | "author" = "view",
): Promise<NextResponse> {
  return withAuth(req, async (ctx) => {
    const org = await resolveServerOrgContext();
    const access = await resolveSpatialAccess(ctx.orgId, Boolean(org.isSlateCeo), Boolean(org.isAdmin));
    if (mode === "author" && !access.canAuthor) {
      return NextResponse.json({ error: "Spatial Walkthrough authoring required" }, { status: 403 });
    }
    if (mode === "view" && !access.canView) {
      return NextResponse.json({ error: "Spatial Walkthrough is not enabled for this organization" }, { status: 403 });
    }
    return handler({ ...ctx, access });
  });
}
