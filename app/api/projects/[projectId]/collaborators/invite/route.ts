import type { NextRequest } from "next/server";
import { z } from "zod";
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok, badRequest, conflict, serverError } from "@/lib/server/api-response";
import {
  assertCanInviteCollaborator,
  CollaboratorLimitError,
} from "@/lib/server/collaborators";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { sendSms, isValidPhone } from "@/lib/sms";
import { sendCollaboratorInviteEmail } from "@/lib/email-collaborators";

const InviteSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    channel: z.enum(["email", "sms", "both", "link"]),
    role: z.enum(["collaborator", "viewer"]).default("collaborator"),
    message: z.string().max(1000).optional(),
  })
  .superRefine((data, refine) => {
    if ((data.channel === "email" || data.channel === "both") && !data.email) {
      refine.addIssue({ code: "custom", path: ["email"], message: "Email required for this channel" });
    }
    if ((data.channel === "sms" || data.channel === "both") && !data.phone) {
      refine.addIssue({ code: "custom", path: ["phone"], message: "Phone required for this channel" });
    }
    if (data.phone && !isValidPhone(data.phone)) {
      refine.addIssue({ code: "custom", path: ["phone"], message: "Phone must be E.164 (e.g. +13105551234)" });
    }
  });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://slate360.ai";
const TOKEN_TTL_DAYS = 14;

type DeliveryReport = {
  email: "sent" | "failed" | "skipped";
  sms: "sent" | "failed" | "skipped";
};

export const POST = (
  req: NextRequest,
  ctx: { params: Promise<{ projectId: string }> },
) =>
  withProjectAuth(req, ctx, async ({ admin, user, projectId, project }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }
    const { email, phone, channel, role, message } = parsed.data;

    const context = await resolveServerOrgContext();
    try {
      await assertCanInviteCollaborator(user.id, context.tier);
    } catch (err) {
      if (err instanceof CollaboratorLimitError) {
        return conflict(err.message);
      }
      return serverError(err instanceof Error ? err.message : "Limit check failed");
    }

    const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: tokenRow, error: tokenErr } = await admin
      .from("invitation_tokens")
      .insert({
        invite_type: "collaborator",
        project_id: projectId,
        created_by: user.id,
        expires_at: expiresAt,
        max_redemptions: 1,
        metadata: { role, channel, email: email ?? null, phone: phone ?? null },
      })
      .select("token")
      .single();

    if (tokenErr || !tokenRow) {
      return serverError(tokenErr?.message ?? "Failed to mint invitation token");
    }

    const token = tokenRow.token as string;
    const inviteUrl = `${APP_URL}/signup?invite=${encodeURIComponent(token)}`;

    const { data: inviteRow, error: inviteErr } = await admin
      .from("project_collaborator_invites")
      .insert({
        project_id: projectId,
        invited_by: user.id,
        email: email ?? null,
        phone: phone ?? null,
        role,
        channel,
        invitation_token: token,
        message: message ?? null,
        last_sent_at: new Date().toISOString(),
        send_count: 1,
      })
      .select("id")
      .single();

    if (inviteErr || !inviteRow) {
      return serverError(inviteErr?.message ?? "Failed to record invite");
    }

    const projectName =
      typeof (project as unknown as { name?: string }).name === "string"
        ? (project as unknown as { name: string }).name
        : "your project";
    const senderName = user.email ?? "A Slate360 teammate";

    const delivery: DeliveryReport = { email: "skipped", sms: "skipped" };

    if ((channel === "email" || channel === "both") && email) {
      try {
        await sendCollaboratorInviteEmail({
          to: email,
          senderName,
          projectName,
          inviteUrl,
          message,
        });
        delivery.email = "sent";
      } catch {
        delivery.email = "failed";
      }
    }

    if ((channel === "sms" || channel === "both") && phone) {
      const sms = await sendSms({
        to: phone,
        body: `${senderName} invited you to collaborate on "${projectName}" via Slate360. ${inviteUrl}`,
      });
      delivery.sms = sms.ok ? "sent" : "failed";
    }

    return ok({
      inviteId: inviteRow.id as string,
      inviteUrl,
      qrPayload: inviteUrl,
      delivery,
    });
  });
