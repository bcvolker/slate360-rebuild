import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { hashSharePassword } from "@/lib/slatedrop/share-password";
import { APP_URL } from "@/lib/email";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { resolveBrandTheme } from "@/lib/spatial-walkthrough/theme";
import { mintShareToken, tokenMeetsEntropyFloor } from "@/lib/spatial-walkthrough/share-token";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const { data: wt } = await admin.from("spatial_walkthroughs").select("*").eq("id", id).eq("org_id", orgId).maybeSingle();
    if (!wt) return notFound("Walkthrough not found");
    if (wt.status !== "ready" && wt.status !== "published") {
      return badRequest("Publish a ready walkthrough before sharing");
    }
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const policy = body?.policy === "public" ? "public" : "client";
    if (body?.policy === "master") return badRequest("MASTER cannot be shared");
    const password = typeof body?.password === "string" ? body.password.trim() : "";
    const entitlements = await resolveOrgEntitlements(orgId);
    const theme = resolveBrandTheme({
      walkthrough: wt.brand_theme,
      canHidePoweredBy: entitlements.canWhiteLabel,
    });
    const minted = mintShareToken();
    if (!tokenMeetsEntropyFloor(minted.token)) return serverError("Failed to mint share token");
    const insert: Record<string, unknown> = {
      token: null,
      token_hash: minted.hash,
      token_prefix: minted.prefix,
      org_id: orgId,
      walkthrough_id: id,
      created_by: user.id,
      policy,
      label: typeof body?.label === "string" ? body.label : wt.title,
      password_hash: password ? hashSharePassword(password) : null,
      expires_at: typeof body?.expiresAt === "string" ? body.expiresAt : null,
      max_views: typeof body?.maxViews === "number" ? body.maxViews : null,
      allow_download: body?.allowDownload === true,
      allow_reshare: body?.allowReshare === true,
      branding_snapshot: theme,
    };
    if (typeof body?.chapterId === "string" && body.chapterId) insert.chapter_id = body.chapterId;
    const { data, error } = await admin.from("spatial_share_tokens").insert(insert).select("id, policy, expires_at, allow_download, token_prefix").single();
    if (error) return serverError(error.message);
    await admin.from("spatial_walkthroughs").update({ status: "published" }).eq("id", id);
    const locator = typeof body?.chapterId === "string" ? `?chapter=${body.chapterId}` : "";
    return ok({
      token: minted.token,
      tokenPrefix: data.token_prefix,
      policy: data.policy,
      shareUrl: `${APP_URL}/w/${minted.token}${locator}`,
      expiresAt: data.expires_at,
      allowDownload: data.allow_download,
    }, 201);
  }, "author");
