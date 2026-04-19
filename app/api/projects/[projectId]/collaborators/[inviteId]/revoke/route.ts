import type { NextRequest } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok, notFound, serverError } from "@/lib/server/api-response";

export const POST = (
  req: NextRequest,
  ctx: { params: Promise<{ projectId: string; inviteId: string }> },
) => {
  const projectCtx = {
    params: ctx.params.then(({ projectId }) => ({ projectId })),
  };

  return withProjectAuth(req, projectCtx, async ({ admin, projectId }) => {
    const { inviteId } = await ctx.params;

    const { data: invite, error: findErr } = await admin
      .from("project_collaborator_invites")
      .select("id, status, invitation_token")
      .eq("id", inviteId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (findErr) return serverError(findErr.message);
    if (!invite) return notFound("Invite not found");

    const { error: updateErr } = await admin
      .from("project_collaborator_invites")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", inviteId);

    if (updateErr) return serverError(updateErr.message);

    if (invite.invitation_token) {
      // Best-effort — also revoke the underlying token so the link stops working.
      await admin
        .from("invitation_tokens")
        .update({ status: "revoked" })
        .eq("token", invite.invitation_token);
    }

    return ok({ revoked: true });
  });
};
