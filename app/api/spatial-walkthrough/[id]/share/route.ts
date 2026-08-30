import { randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { hashSharePassword } from "@/lib/slatedrop/share-password";
import { APP_URL } from "@/lib/email";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { resolveBrandTheme } from "@/lib/spatial-walkthrough/theme";

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
    const password = typeof body?.password === "string" ? body.password.trim() : "";
    const entitlements = await resolveOrgEntitlements(orgId);
    const theme = resolveBrandTheme({
      walkthrough: wt.brand_theme,
      canHidePoweredBy: entitlements.canWhiteLabel,
    });
    const token = randomBytes(24).toString("base64url");
    const { data, error } = await admin.from("spatial_share_tokens").insert({
      token,
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
    }).select("token, policy, expires_at, allow_download").single();
    if (error) return serverError(error.message);
    await admin.from("spatial_walkthroughs").update({ status: "published" }).eq("id", id);
    return ok({
      token: data.token,
      policy: data.policy,
      shareUrl: `${APP_URL}/w/${data.token}`,
      expiresAt: data.expires_at,
      allowDownload: data.allow_download,
    }, 201);
  }, "author");
