/**
 * POST /api/email/send
 * Authenticated email dispatch endpoint — used by project external-links,
 * SlateDrop Secure Send, and any server-side feature that needs to send email.
 *
 * NOTE: Pre-auth flows (welcome, password-reset) call lib/email directly
 * from server code — they do NOT go through this route.
 *
 * Body shape (discriminated union on `type`):
 *   { type: "welcome",     to, name?, confirmUrl }
 *   { type: "secure-send", to, senderName, fileName, shareUrl, permission, expiresAt?, message? }
 *   { type: "password-reset", to, name?, resetUrl }
 *   { type: "external-response-request", to, senderName, projectName, ... }
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import {
  sendWelcomeEmail,
  sendSecureSendEmail,
  sendPasswordResetEmail,
  sendExternalResponseRequestEmail,
} from "@/lib/email";

export const POST = (req: NextRequest) =>
  withAuth(req, async () => {
    const body = await req.json();

    try {
      switch (body.type) {
        case "welcome":
          await sendWelcomeEmail({
            to: body.to,
            name: body.name,
            confirmUrl: body.confirmUrl,
          });
          break;

        case "secure-send":
          await sendSecureSendEmail({
            to: body.to,
            senderName: body.senderName,
            fileName: body.fileName,
            shareUrl: body.shareUrl,
            permission: body.permission ?? "view",
            expiresAt: body.expiresAt,
            message: body.message,
          });
          break;

        case "password-reset":
          await sendPasswordResetEmail({
            to: body.to,
            name: body.name,
            resetUrl: body.resetUrl,
          });
          break;

        case "external-response-request":
          await sendExternalResponseRequestEmail({
            to: body.to,
            senderName: body.senderName,
            projectName: body.projectName,
            itemType: body.itemType,
            itemTitle: body.itemTitle,
            responseUrl: body.responseUrl,
            expiresAt: body.expiresAt,
            message: body.message,
          });
          break;

        default:
          return badRequest("Unknown email type");
      }

      return ok({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[api/email/send]", message);
      return serverError(message);
    }
  });
