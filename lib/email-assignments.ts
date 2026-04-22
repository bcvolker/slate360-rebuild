/**
 * lib/email-assignments.ts
 * Email helpers for Site Walk assignment notifications.
 */
import { sendEmail, brandedHtml, ctaButton } from "@/lib/email";

export type AssignmentEmailKind = "task" | "item";

interface BaseArgs {
  to: string;
  recipientName?: string;
  assignerName: string;
  title: string;
  message?: string;
  priority?: string | null;
  dueDate?: string | null;
  link: string;
  projectName?: string | null;
}

/**
 * Sends an email when a user is assigned to either a Site Walk task
 * (`site_walk_assignments`) or directly to a Site Walk item
 * (`site_walk_items.assigned_to`).
 */
export async function sendAssignmentNotificationEmail(
  args: BaseArgs & { kind: AssignmentEmailKind },
) {
  const greetingName = args.recipientName?.trim() || args.to.split("@")[0];
  const safe = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const kindLabel = args.kind === "task" ? "task" : "punch list item";
  const subject = `${args.assignerName} assigned you a ${kindLabel}: "${args.title}"`;

  const meta: string[] = [];
  if (args.projectName) meta.push(`Project: <strong>${safe(args.projectName)}</strong>`);
  if (args.priority) meta.push(`Priority: <strong>${safe(args.priority)}</strong>`);
  if (args.dueDate) {
    const dt = new Date(args.dueDate);
    if (!Number.isNaN(dt.getTime())) {
      meta.push(`Due: <strong>${dt.toLocaleDateString()}</strong>`);
    }
  }

  const body = `
    <h2 style="margin:0 0 8px;color:#3B82F6;font-size:22px;font-weight:800;">
      ${safe(args.assignerName)} assigned you a ${kindLabel}
    </h2>
    <p style="margin:0 0 6px;color:#111827;font-size:16px;font-weight:600;">${safe(args.title)}</p>
    ${meta.length > 0 ? `<p style="margin:0 0 18px;color:#6b7280;font-size:13px;line-height:1.7;">${meta.join(" &middot; ")}</p>` : ""}
    <p style="margin:0 0 18px;color:#6b7280;font-size:15px;line-height:1.7;">
      Hi ${safe(greetingName)}, you have a new Site Walk ${kindLabel} waiting for you in Slate360.
    </p>
    ${
      args.message
        ? `<div style="margin:0 0 20px;padding:14px;background:#f3f4f6;border-left:4px solid #3B82F6;border-radius:4px;color:#4b5563;font-size:14px;font-style:italic;">"${safe(args.message)}"</div>`
        : ""
    }
    ${ctaButton("Open in Slate360", args.link)}
    <p style="margin:18px 0 0;font-size:12px;color:#9ca3af;">
      You're receiving this because someone in your organization assigned you to this ${kindLabel}.
    </p>`;

  return sendEmail({
    to: args.to,
    subject,
    html: brandedHtml("New assignment", body),
  });
}
