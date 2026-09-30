import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/server/api-response";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { resolveBrandTheme } from "@/lib/spatial-walkthrough/theme";
import { mintShareToken, tokenMeetsEntropyFloor } from "@/lib/spatial-walkthrough/share-token";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

const PREVIEW_MINUTES = 30;

/**
 * "Preview as client": a short-lived client-policy token on the project's latest ready
 * walkthrough, rendered through the real portal path. Preview tokens never appear in
 * share lists and show an operator banner in the portal.
 */
export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId } = await ctx.params;
    const { data: project } = await admin.from("projects").select("id").eq("id", projectId).eq("org_id", orgId).maybeSingle();
    if (!project) return notFound("Project not found");
    const { data: walk } = await admin
      .from("spatial_walkthroughs")
      .select("id, title, brand_theme")
      .eq("project_id", projectId)
      .eq("org_id", orgId)
      .in("status", ["ready", "published"])
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!walk) return badRequest("No walkthrough is ready to preview");

    const entitlements = await resolveOrgEntitlements(orgId);
    const minted = mintShareToken();
    if (!tokenMeetsEntropyFloor(minted.token)) return serverError("Failed to mint preview token");
    const { error } = await admin.from("spatial_share_tokens").insert({
      token: null,
      token_hash: minted.hash,
      token_prefix: minted.prefix,
      org_id: orgId,
      walkthrough_id: walk.id,
      created_by: user.id,
      policy: "client",
      purpose: "preview",
      audience: "client",
      label: "Operator preview",
      expires_at: new Date(Date.now() + PREVIEW_MINUTES * 60_000).toISOString(),
      allow_download: false,
      allow_reshare: false,
      branding_snapshot: resolveBrandTheme({ walkthrough: walk.brand_theme, canHidePoweredBy: entitlements.canWhiteLabel }),
    });
    if (error) return serverError(error.message);
    return ok({ url: `/portal/${minted.token}`, expiresInMinutes: PREVIEW_MINUTES });
  }, "author");
