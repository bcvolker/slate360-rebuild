/**
 * POST /api/email/send
 * Universal email dispatch endpoint used by signup (welcome), SlateDrop
 * Secure Send, and any other feature that needs to send email.
 *
 * Body shape (discriminated union on `type`):
 *   { type: "welcome",     to, name?, confirmUrl }
 *   { type: "secure-send", to, senderName, fileName, shareUrl, permission, expiresAt?, message? }
 *   { type: "password-reset", to, name?, resetUrl }
 */
import { NextRequest, NextResponse } from "next/server";
import {
  sendWelcomeEmail,
  sendSecureSendEmail,
  sendPasswordResetEmail,
} from "@/lib/email";

export async function POST(req: NextRequest) {
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

      default:
        return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/email/send]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
