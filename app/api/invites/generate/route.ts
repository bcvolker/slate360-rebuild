import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, serverError } from "@/lib/server/api-response";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { checkBetaApproved, isOwnerEmail } from "@/lib/server/beta-access";
import { getScopedProjectForUser } from "@/lib/projects/access";

export const runtime = "nodejs";

type InviteGenerateBody = {
  inviteType?: "ceo" | "beta" | "collaborator";
  accessLevel?: "vip_beta" | "trial";
  projectId?: string;
  expiresAt?: string;
  maxRedemptions?: number;
};

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    const body = (await req.json().catch(() => ({}))) as InviteGenerateBody;
    const inviteType = body.inviteType;

    if (!inviteType || !["ceo", "beta", "collaborator"].includes(inviteType)) {
      return badRequest("inviteType must be one of: ceo, beta, collaborator");
    }

    const orgContext = await resolveServerOrgContext();
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      return badRequest("expiresAt must be a valid future timestamp");
    }

    const token = randomUUID();
    let projectId: string | null = null;
    let maxRedemptions = 1;
    const metadata: Record<string, unknown> = {};

    if (inviteType === "ceo") {
      if (!isOwnerEmail(user.email)) {
        return forbidden("Only the CEO can generate CEO invites");
      }

      metadata.access_level = body.accessLevel === "vip_beta" ? "vip_beta" : "trial";
      maxRedemptions = 1;
    }

    if (inviteType === "beta") {
      const approved = await checkBetaApproved(user.id);
      if (!approved && !orgContext.isSlateCeo) {
        return forbidden("Only approved beta users can generate beta invites");
      }

      maxRedemptions = Math.max(1, Math.min(body.maxRedemptions ?? 3, 5));
      metadata.access_level = "beta";
      metadata.inviter_role = orgContext.isSlateCeo ? "ceo" : "beta_tester";
    }

    if (inviteType === "collaborator") {
      if (!body.projectId) {
        return badRequest("projectId is required for collaborator invites");
      }

      const { project } = await getScopedProjectForUser(user.id, body.projectId, "id, org_id, name");
      if (!project) {
        return forbidden("Project not found or access denied");
      }

      projectId = body.projectId;
      maxRedemptions = 1;
      metadata.project_name = (project as { name?: string }).name ?? null;
      metadata.access_level = "project_collaborator";
    }

    const { data, error } = await admin
      .from("invitation_tokens")
      .insert({
        token,
        created_by: user.id,
        org_id: orgId,
        invite_type: inviteType,
        project_id: projectId,
        status: "active",
        expires_at: expiresAt.toISOString(),
        max_redemptions: maxRedemptions,
        redeemed_count: 0,
        metadata,
      })
      .select("id, token, invite_type, project_id, status, expires_at, max_redemptions")
      .single();

    if (error || !data) {
      return serverError(error?.message ?? "Failed to generate invitation token");
    }

    const origin = req.nextUrl.origin;
    const inviteUrl = `${origin}/signup?invite=${token}`;

    return ok({
      invite: data,
      inviteUrl,
      qrPayload: inviteUrl,
    });
  });