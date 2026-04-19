/**
 * lib/email.ts
 * Resend email client + typed send helpers.
 * All outbound email from Slate360 flows through here.
 */
import { Resend } from "resend";

export const FROM = process.env.EMAIL_FROM ?? "Slate360 <noreply@slate360.ai>";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://slate360.ai";

/** Lazy singleton — only instantiates when actually sending */
let _resend: Resend | null = null;
function getResend(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  _resend = new Resend(key);
  return _resend;
}

/** Wrapper that sends via Resend and throws on failure */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });
  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
  return data;
}

/* ── Branded HTML wrapper ── */
export function brandedHtml(title: string, body: string): string {
  const logoUrl = "https://www.slate360.ai/uploads/slate360-logo-reversed-v2.svg";
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
            <td style="background:#18181b;padding:24px 40px;">
              <img src="${logoUrl}" alt="Slate360" width="180" height="auto" style="display:block;max-width:180px;height:auto;" />
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
                <a href="${APP_URL}" style="color:#F59E0B;text-decoration:none;">Slate360</a>.
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
export function ctaButton(label: string, href: string) {
  return `<table cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
    <tr>
      <td style="background:#F59E0B;border-radius:10px;">
        <a href="${href}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.1px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

/* ── Email: Welcome (sent after email is confirmed) ── */
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
    <h2 style="margin:0 0 8px;color:#F59E0B;font-size:24px;font-weight:800;">Welcome to Slate360${displayName ? `, ${displayName}` : ""}! 🎉</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">
      Your email has been verified and your account is ready. You now have access to your dashboard, SlateDrop file manager, and all Slate360 modules.
    </p>
    ${ctaButton("Go to my dashboard →", confirmUrl)}
    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">
      If you didn't create a Slate360 account, you can safely ignore this email.
    </p>`;
  
  return sendEmail({
    to,
    subject: "Welcome to Slate360! 🎉",
    html: brandedHtml("Welcome to Slate360", body),
  });
}

/* ── Email: Secure Send (SlateDrop) ── */
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
  const body = `
    <h2 style="margin:0 0 8px;color:#F59E0B;font-size:24px;font-weight:800;">${senderName} shared a file with you</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">
      You have been granted <strong>${permission}</strong> access to the file <strong>${fileName}</strong> via SlateDrop.
    </p>
    ${
      message
        ? `<div style="margin:0 0 24px;padding:16px;background:#f3f4f6;border-left:4px solid #F59E0B;border-radius:4px;color:#4b5563;font-size:14px;font-style:italic;">"${message}"</div>`
        : ""
    }
    ${ctaButton(permission === "download" ? "Download File" : "View File", shareUrl)}
    ${
      expiresAt
        ? `<p style="margin:20px 0 0;font-size:12px;color:#ef4444;font-weight:600;">
            ⚠️ This secure link expires on ${new Date(expiresAt).toLocaleDateString()}.
           </p>`
        : ""
    }
  `;

  return sendEmail({
    to,
    subject: `${senderName} shared "${fileName}" with you via SlateDrop`,
    html: brandedHtml("Secure File Share", body),
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
  const displayName = name ?? to.split("@")[0];
  const body = `
    <h2 style="margin:0 0 8px;color:#F59E0B;font-size:24px;font-weight:800;">Reset your password</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">
      Hi ${displayName},<br/><br/>
      We received a request to reset the password for your Slate360 account. Click the button below to choose a new password.
    </p>
    ${ctaButton("Reset Password", resetUrl)}
    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>`;

  return sendEmail({
    to,
    subject: "Reset your Slate360 password",
    html: brandedHtml("Password Reset", body),
  });
}

/* ── Email: External response request (RFI/Submittal/Document) ── */
export async function sendExternalResponseRequestEmail({
  to,
  senderName,
  projectName,
  itemType,
  itemTitle,
  responseUrl,
  expiresAt,
  message,
}: {
  to: string;
  senderName: string;
  projectName: string;
  itemType: "RFI" | "Submittal" | "Document";
  itemTitle: string;
  responseUrl: string;
  expiresAt?: string;
  message?: string;
}) {
  const body = `
    <h2 style="margin:0 0 8px;color:#F59E0B;font-size:24px;font-weight:800;">Response requested for ${itemType}</h2>
    <p style="margin:0 0 18px;color:#6b7280;font-size:15px;line-height:1.7;">
      ${senderName} requested your response in <strong>${projectName}</strong>.
    </p>
    <div style="margin:0 0 20px;padding:14px 16px;background:#f3f4f6;border-left:4px solid #F59E0B;border-radius:6px;">
      <p style="margin:0;color:#374151;font-size:13px;"><strong>${itemType}:</strong> ${itemTitle}</p>
      ${
        message
          ? `<p style="margin:10px 0 0;color:#4b5563;font-size:13px;">${message}</p>`
          : ""
      }
    </div>
    ${ctaButton("Review & Respond Securely", responseUrl)}
    <p style="margin:14px 0 0;font-size:12px;color:#6b7280;">
      No Slate360 account is required to respond.
    </p>
    ${
      expiresAt
        ? `<p style="margin:8px 0 0;font-size:12px;color:#ef4444;font-weight:600;">This link expires on ${new Date(expiresAt).toLocaleDateString()}.</p>`
        : ""
    }
  `;

  return sendEmail({
    to,
    subject: `${senderName} requested your response on ${itemType}: ${itemTitle}`,
    html: brandedHtml("Slate360 Response Request", body),
  });
}

/* ── Email: Confirmation ── */
export async function sendConfirmationEmail({
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
    <h2 style="margin:0 0 8px;color:#F59E0B;font-size:24px;font-weight:800;">Confirm your email</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">
      Hi ${displayName},<br/><br/>
      Please confirm your email address to complete your Slate360 registration.
    </p>
    ${ctaButton("Confirm Email", confirmUrl)}
    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">
      If you didn't create a Slate360 account, you can safely ignore this email.
    </p>`;

  return sendEmail({
    to,
    subject: "Confirm your Slate360 email",
    html: brandedHtml("Email Confirmation", body),
  });
}
