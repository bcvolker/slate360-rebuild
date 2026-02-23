const fs = require('fs');
const path = './lib/email.ts';
let content = fs.readFileSync(path, 'utf8');

const newContent = `/**
 * lib/email.ts
 * Nodemailer email client + typed send helpers.
 * All outbound email from Slate360 flows through here.
 */
import nodemailer from "nodemailer";

export const FROM = process.env.EMAIL_FROM ?? "Slate360 <noreply@slate360.ai>";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://slate360.ai";

/** Lazy getter — only instantiates when actually sending, avoids build-time throw */
function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error("SMTP_USER or SMTP_PASS is not set");
  
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
  });
}

/* ── Branded HTML wrapper ── */
function brandedHtml(title: string, body: string): string {
  return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>\${title}</title>
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
              \${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f1f1f1;background:#fafafa;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                You're receiving this email because you have an account on
                <a href="\${APP_URL}" style="color:#FF4D00;text-decoration:none;">Slate360</a>.
                &copy; \${new Date().getFullYear()} Slate360. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>\`;
}

/* ── Button helper ── */
function ctaButton(label: string, href: string) {
  return \`<table cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
    <tr>
      <td style="background:#FF4D00;border-radius:10px;">
        <a href="\${href}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.1px;">\${label}</a>
      </td>
    </tr>
  </table>\`;
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
  const body = \`
    <h2 style="margin:0 0 8px;color:#1E3A8A;font-size:24px;font-weight:800;">Welcome to Slate360\${displayName ? \`, \${displayName}\` : ""}! 🎉</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">
      Your email has been verified and your account is ready. You now have access to your dashboard, SlateDrop file manager, and all Slate360 modules.
    </p>
    \${ctaButton("Go to my dashboard →", confirmUrl)}
    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">
      If you didn't create a Slate360 account, you can safely ignore this email.
    </p>\`;
  
  const transporter = getTransporter();
  return transporter.sendMail({
    from: FROM,
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
  const body = \`
    <h2 style="margin:0 0 8px;color:#1E3A8A;font-size:24px;font-weight:800;">\${senderName} shared a file with you</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">
      You have been granted <strong>\${permission}</strong> access to the file <strong>\${fileName}</strong> via SlateDrop.
    </p>
    \${
      message
        ? \`<div style="margin:0 0 24px;padding:16px;background:#f3f4f6;border-left:4px solid #FF4D00;border-radius:4px;color:#4b5563;font-size:14px;font-style:italic;">"\${message}"</div>\`
        : ""
    }
    \${ctaButton(permission === "download" ? "Download File" : "View File", shareUrl)}
    \${
      expiresAt
        ? \`<p style="margin:20px 0 0;font-size:12px;color:#ef4444;font-weight:600;">
            ⚠️ This secure link expires on \${new Date(expiresAt).toLocaleDateString()}.
           </p>\`
        : ""
    }
  \`;

  const transporter = getTransporter();
  return transporter.sendMail({
    from: FROM,
    to,
    subject: \`\${senderName} shared "\${fileName}" with you via SlateDrop\`,
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
  const body = \`
    <h2 style="margin:0 0 8px;color:#1E3A8A;font-size:24px;font-weight:800;">Reset your password</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">
      Hi \${displayName},<br/><br/>
      We received a request to reset the password for your Slate360 account. Click the button below to choose a new password.
    </p>
    \${ctaButton("Reset Password", resetUrl)}
    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>\`;

  const transporter = getTransporter();
  return transporter.sendMail({
    from: FROM,
    to,
    subject: "Reset your Slate360 password",
    html: brandedHtml("Password Reset", body),
  });
}
`;

fs.writeFileSync(path, newContent);
console.log('Patched Email');
