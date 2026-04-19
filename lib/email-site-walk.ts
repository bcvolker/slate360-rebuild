/**
 * lib/email-site-walk.ts
 * Site Walk–specific email helpers. Extends the core email module.
 */
import { sendEmail, brandedHtml, ctaButton } from "@/lib/email";

/* ── Email: Deliverable Shared (Site Walk) ── */
export async function sendDeliverableShareEmail({
  to,
  senderName,
  deliverableTitle,
  deliverableType,
  shareUrl,
  expiresAt,
  message,
}: {
  to: string;
  senderName: string;
  deliverableTitle: string;
  deliverableType: string;
  shareUrl: string;
  expiresAt?: string;
  message?: string;
}) {
  const body = `
    <h2 style="margin:0 0 8px;color:#F59E0B;font-size:24px;font-weight:800;">${senderName} shared a ${deliverableType} with you</h2>
    <p style="margin:0 0 18px;color:#6b7280;font-size:15px;line-height:1.7;">
      You've been sent <strong>"${deliverableTitle}"</strong> via Slate360 Site Walk.
    </p>
    ${
      message
        ? `<div style="margin:0 0 24px;padding:16px;background:#f3f4f6;border-left:4px solid #F59E0B;border-radius:4px;color:#4b5563;font-size:14px;font-style:italic;">"${message}"</div>`
        : ""
    }
    ${ctaButton("View Deliverable", shareUrl)}
    ${
      expiresAt
        ? `<p style="margin:20px 0 0;font-size:12px;color:#ef4444;font-weight:600;">
            ⚠️ This link expires on ${new Date(expiresAt).toLocaleDateString()}.
           </p>`
        : ""
    }
    <p style="margin:14px 0 0;font-size:12px;color:#6b7280;">
      No Slate360 account is required to view this deliverable.
    </p>`;

  return sendEmail({
    to,
    subject: `${senderName} shared "${deliverableTitle}" with you`,
    html: brandedHtml("Deliverable Shared", body),
  });
}
