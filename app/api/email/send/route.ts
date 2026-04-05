/**
 * POST /api/email/send
 * Authenticated email dispatch endpoint — used by project external-links,
 * SlateDrop Secure Send, and any server-side feature that needs to send email.
 *
 * NOTE: Pre-auth flows (welcome, password-reset) call lib/email directly
 * from server code — they do NOT go through this route.
 *
 * Body is a Zod-validated discriminated union on `type`.
 * URLs are restricted to our own origin to prevent phishing injection.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { parseBody } from "@/lib/server/validate";
import { createRateLimiter } from "@/lib/server/rate-limit";
import {
  sendWelcomeEmail,
  sendSecureSendEmail,
  sendPasswordResetEmail,
  sendExternalResponseRequestEmail,
} from "@/lib/email";

const checkRateLimit = createRateLimiter("email:send", 10, 60); // 10 req / 1 min

/** Only allow URLs pointing to our own domain(s). Prevents phishing injection. */
const safeUrl = z.string().url().refine(
  (url) => {
    try {
      const host = new URL(url).hostname;
      return host === "www.slate360.ai" || host === "slate360.ai" || host.endsWith(".vercel.app");
    } catch {
      return false;
    }
  },
  { message: "URL must point to a slate360.ai domain" },
);

const WelcomeSchema = z.object({
  type: z.literal("welcome"),
  to: z.string().email(),
  name: z.string().max(200).optional(),
  confirmUrl: safeUrl,
});

const SecureSendSchema = z.object({
  type: z.literal("secure-send"),
  to: z.string().email(),
  senderName: z.string().min(1).max(200),
  fileName: z.string().min(1).max(255),
  shareUrl: safeUrl,
  permission: z.enum(["view", "download"]),
  expiresAt: z.string().optional(),
  message: z.string().max(2000).optional(),
});

const PasswordResetSchema = z.object({
  type: z.literal("password-reset"),
  to: z.string().email(),
  name: z.string().max(200).optional(),
  resetUrl: safeUrl,
});

const ExternalResponseSchema = z.object({
  type: z.literal("external-response-request"),
  to: z.string().email(),
  senderName: z.string().min(1).max(200),
  projectName: z.string().min(1).max(200),
  itemType: z.enum(["RFI", "Submittal", "Document"]),
  itemTitle: z.string().min(1).max(200),
  responseUrl: safeUrl,
  expiresAt: z.string().optional(),
  message: z.string().max(2000).optional(),
});

const EmailSendSchema = z.discriminatedUnion("type", [
  WelcomeSchema,
  SecureSendSchema,
  PasswordResetSchema,
  ExternalResponseSchema,
]);

export const POST = (req: NextRequest) =>
  withAuth(req, async () => {
    const rateLimited = await checkRateLimit(req);
    if (rateLimited) return rateLimited;

    const parsed = await parseBody(req, EmailSendSchema);
    if (!parsed.success) return parsed.error;

    const body = parsed.data;

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
            permission: body.permission,
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
