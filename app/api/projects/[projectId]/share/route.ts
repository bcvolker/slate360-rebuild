import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { APP_URL } from "@/lib/email";
import { tokenMeetsEntropyFloor } from "@/lib/spatial-walkthrough/share-token";
import { createProjectShare, recordPortalAudit } from "@/lib/spatial-walkthrough/project-share";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

/** Creator-side: list this project's portal shares (never returns a raw token — only what was minted at creation time, which the creator already has from the create response). */
export const GET = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId } = await ctx.params;
    const { data, error } = await admin
      .from("spatial_project_shares")
      .select("id, label, recipient_name, recipient_email, token_prefix, expires_at, max_views, view_count, allow_download, is_revoked, last_viewed_at, created_at")
      .eq("project_id", projectId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) return serverError(error.message);
    return ok({ shares: data ?? [] });
  }, "view");

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ orgId, user }) => {
    if (!orgId) return unauthorized("Organization required");
    const { projectId } = await ctx.params;
    const admin = createAdminClient();
    const { data: project } = await admin.from("projects").select("id").eq("id", projectId).eq("org_id", orgId).maybeSingle();
    if (!project) return notFound("Project not found");

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const password = typeof body?.password === "string" ? body.password.trim() : "";

    const { token, share } = await createProjectShare({
      orgId,
      projectId,
      createdBy: user.id,
      label: typeof body?.label === "string" ? body.label : null,
      recipientName: typeof body?.recipientName === "string" ? body.recipientName : null,
      recipientEmail: typeof body?.recipientEmail === "string" ? body.recipientEmail : null,
      password: password || null,
      expiresAt: typeof body?.expiresAt === "string" ? body.expiresAt : null,
      maxViews: typeof body?.maxViews === "number" ? body.maxViews : null,
      allowDownload: body?.allowDownload === true,
      allowEmbed: body?.allowEmbed === true,
      grants: {
        can_comment: body?.canComment !== false,
        can_create_items: body?.canCreateItems !== false,
        can_see_documents: body?.canSeeDocuments !== false,
        can_see_internal_items: body?.canSeeInternalItems === true,
        can_measure: body?.canMeasure === true,
      },
    });
    if (!tokenMeetsEntropyFloor(token)) return serverError("Failed to mint portal token");

    await recordPortalAudit(admin, { orgId, projectId, shareId: share.id, userId: user.id, event: "portal_share_created" });

    return ok(
      {
        id: share.id,
        token,
        tokenPrefix: share.token_prefix,
        portalUrl: `${APP_URL}/portal/${token}`,
        expiresAt: share.expires_at,
        allowDownload: share.allow_download,
      },
      201,
    );
  }, "author");
