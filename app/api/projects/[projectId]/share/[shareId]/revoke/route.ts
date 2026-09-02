import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, unauthorized } from "@/lib/server/api-response";
import { revokeProjectShare, recordPortalAudit } from "@/lib/spatial-walkthrough/project-share";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string; shareId: string }> };

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ orgId, user }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId, shareId } = await ctx.params;
    await revokeProjectShare(shareId, orgId);
    const admin = createAdminClient();
    await recordPortalAudit(admin, { orgId, projectId, shareId, userId: user.id, event: "portal_share_revoked" });
    return ok({ revoked: true });
  }, "author");
