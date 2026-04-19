import type { NextRequest } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { sendSms } from "@/lib/sms";
import { sendCollaboratorInviteEmail } from "@/lib/email-collaborators";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://slate360.ai";

type InviteRow = {
  id: string;
  email: string | null;
  phone: string | null;
  channel: "email" | "sms" | "both" | "link";
  status: string;
  message: string | null;
  invitation_token: string | null;
  send_count: number;
};

export const POST = (
  req: NextRequest,
  ctx: { params: Promise<{ projectId: string; inviteId: string }> },
) => {
  const projectCtx = {
    params: ctx.params.then(({ projectId }) => ({ projectId })),
  };

  return withProjectAuth(req, projectCtx, async ({ admin, user, projectId, project }) => {
    const { inviteId } = await ctx.params;

    const { data: row, error: findErr } = await admin
      .from("project_collaborator_invites")
      .select("id, email, phone, channel, status, message, invitation_token, send_count")
      .eq("id", inviteId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (findErr) return serverError(findErr.message);
    if (!row) return notFound("Invite not found");

    const invite = row as InviteRow;
    if (invite.status !== "pending") {
      return badRequest(`Cannot resend — invite is ${invite.status}`);
    }
    if (!invite.invitation_token) {
      return badRequest("Invite has no token to resend");
    }

    const inviteUrl = `${APP_URL}/signup?invite=${encodeURIComponent(invite.invitation_token)}`;
    const senderName = user.email ?? "A Slate360 teammate";
    const projectName =
      typeof (project as unknown as { name?: string }).name === "string"
        ? (project as unknown as { name: string }).name
        : "your project";

    const delivery = { email: "skipped" as "sent" | "failed" | "skipped", sms: "skipped" as "sent" | "failed" | "skipped" };

    if ((invite.channel === "email" || invite.channel === "both") && invite.email) {
      try {
        await sendCollaboratorInviteEmail({
          to: invite.email,
          senderName,
          projectName,
          inviteUrl,
          message: invite.message ?? undefined,
        });
        delivery.email = "sent";
      } catch {
        delivery.email = "failed";
      }
    }

    if ((invite.channel === "sms" || invite.channel === "both") && invite.phone) {
      const sms = await sendSms({
        to: invite.phone,
        body: `Reminder: ${senderName} invited you to collaborate on "${projectName}" via Slate360. ${inviteUrl}`,
      });
      delivery.sms = sms.ok ? "sent" : "failed";
    }

    await admin
      .from("project_collaborator_invites")
      .update({
        last_sent_at: new Date().toISOString(),
        send_count: invite.send_count + 1,
      })
      .eq("id", inviteId);

    return ok({ resent: true, delivery });
  });
};
