import { sendEmail, brandedHtml, ctaButton } from "@/lib/email";
import { EMAIL_COLORS as C } from "@/lib/email-theme";

/** Project-collaborator invite — used by the People tab + invite API. */
export async function sendCollaboratorInviteEmail({
  to,
  senderName,
  projectName,
  inviteUrl,
  message,
}: {
  to: string;
  senderName: string;
  projectName: string;
  inviteUrl: string;
  message?: string;
}) {
  const safeName = escapeHtml(senderName);
  const safeProject = escapeHtml(projectName);
  const safeMessage = message ? escapeHtml(message) : null;

  const body = `
    <h2 style="margin:0 0 8px;color:${C.primary};font-size:24px;font-weight:800;">
      ${safeName} invited you to collaborate on ${safeProject}
    </h2>
    <p style="margin:0 0 18px;color:${C.textMuted};font-size:15px;line-height:1.7;">
      You've been invited as an outside collaborator on a Slate360 project.
      Create a free account to accept the invite — no subscription required.
    </p>
    ${
      safeMessage
        ? `<div style="margin:0 0 20px;padding:14px 16px;background:${C.quoteBg};border-left:4px solid ${C.quoteBorder};border-radius:6px;color:${C.quoteText};font-size:13px;font-style:italic;">"${safeMessage}"</div>`
        : ""
    }
    ${ctaButton("Accept invite & sign in", inviteUrl)}
    <p style="margin:18px 0 0;font-size:12px;color:${C.textFaint};">
      This link is single-use and expires in 14 days. If you weren't expecting
      this email you can safely ignore it.
    </p>`;

  return sendEmail({
    to,
    subject: `${senderName} invited you to collaborate on ${projectName}`,
    html: brandedHtml("Project collaboration invite", body),
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
