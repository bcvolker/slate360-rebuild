/**
 * lib/email.ts
 * Resend email client + typed send helpers.
 * All outbound email from Slate360 flows through here.
 */
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY ?? "");

export const FROM = process.env.EMAIL_FROM ?? "Slate360 <noreply@slate360.io>";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://slate360.io";

/* ── Branded HTML wrapper ── */
function brandedHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1E3A8A;padding:28px 40px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:8px;height:28px;background:#FF4D00;border-radius:3px;"></td>
                  <td style="padding-left:12px;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Slate360</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f1f1f1;background:#fafafa;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                You're receiving this email because you have an account on
                <a href="${APP_URL}" style="color:#FF4D00;text-decoration:none;">Slate360</a>.
                &copy; ${new Date().getFullYear()} Slate360. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ── Button helper ── */
function ctaButton(label: string, href: string) {
  return `<table cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
    <tr>
      <td style="background:#FF4D00;border-radius:10px;">
        <a href="${href}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.1px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

/* ── Email: Welcome / Confirm Account ── */
export async function sendWelcomeEmail({
  to,
  name,
  confirmUrl,
}: {
  to: string;
  name?: string;
  confirmUrl: string;
}) {
  const displayName = name ?? to.split("@")[0];
  const body = `
    <h2 style="margin:0 0 8px;color:#1E3A8A;font-size:24px;font-weight:800;">Welcome to Slate360${displayName ? `, ${displayName}` : ""}.</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">
      Your account is almost ready. Confirm your email address to access your dashboard and start building.
    </p>
    ${ctaButton("Confirm my email →", confirmUrl)}
    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">
      This link expires in 24 hours. If you didn't sign up for Slate360, you can safely ignore this email.
    </p>`;
  return resend.emails.send({
    from: FROM,
    to,
    subject: "Confirm your Slate360 account",
    html: brandedHtml("Confirm your Slate360 account", body),
  });
}

/* ── Email: Secure Send / File Share ── */
export async function sendSecureSendEmail({
  to,
  senderName,
  fileName,
  shareUrl,
  permission,
  expiresAt,
  message,
}: {
  to: string;
  senderName: string;
  fileName: string;
  shareUrl: string;
  permission: "view" | "download";
  expiresAt?: string;
  message?: string;
}) {
  const expiryText = expiresAt
    ? `This link expires on ${new Date(expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
    : "";
  const permText = permission === "download" ? "view and download" : "view";
  const body = `
    <h2 style="margin:0 0 8px;color:#1E3A8A;font-size:22px;font-weight:800;">You received a file</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.7;">
      <strong style="color:#111827;">${senderName}</strong> shared <strong style="color:#111827;">${fileName}</strong> with you via Slate360 SlateDrop. You have permission to ${permText} this file.
    </p>
    ${message ? `<div style="background:#f7f8fa;border-left:3px solid #FF4D00;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:20px;"><p style="margin:0;font-size:14px;color:#374151;line-height:1.6;font-style:italic;">&ldquo;${message}&rdquo;</p></div>` : ""}
    ${ctaButton("Access file →", shareUrl)}
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">${expiryText}</p>`;
  return resend.emails.send({
    from: FROM,
    to,
    subject: `${senderName} shared "${fileName}" with you`,
    html: brandedHtml(`${senderName} shared a file with you`, body),
  });
}

/* ── Email: Password Reset ── */
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name?: string;
  resetUrl: string;
}) {
  const displayName = name ?? "there";
  const body = `
    <h2 style="margin:0 0 8px;color:#1E3A8A;font-size:22px;font-weight:800;">Reset your password</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">
      Hi ${displayName}, we received a request to reset your Slate360 password. Click below to choose a new one.
    </p>
    ${ctaButton("Reset password →", resetUrl)}
    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">
      This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>`;
  return resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your Slate360 password",
    html: brandedHtml("Reset your Slate360 password", body),
  });
}
