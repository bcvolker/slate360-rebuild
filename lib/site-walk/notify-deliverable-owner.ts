import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type DeliverableOwner = {
  title: string | null;
  project_id: string | null;
  created_by: string | null;
};

/**
 * Best-effort owner notification when a recipient asks a question OR leaves a
 * per-item comment on a shared deliverable — in-app `project_notifications` +
 * email. Non-fatal (never blocks the recipient's submit). Shared by the
 * whole-deliverable Q&A route and the per-item comments route so EVERY question/
 * comment notifies the owner (REPORT-005).
 */
export async function notifyDeliverableOwner(
  admin: SupabaseClient,
  del: DeliverableOwner,
  text: string,
  author: string,
  kind: "question" | "comment" = "question",
): Promise<void> {
  const title = del.title ?? "your deliverable";
  const label = kind === "comment" ? "comment" : "question";

  if (del.project_id && del.created_by) {
    await admin
      .from("project_notifications")
      .insert({
        user_id: del.created_by,
        project_id: del.project_id,
        title: `New ${label} on “${title}”`,
        message: `${author}: ${text.slice(0, 140)}`,
        link_path: `/projects/${del.project_id}/deliverables`,
      })
      .then(() => undefined, () => undefined);
  }

  if (!del.created_by) return;
  const { data: owner } = await admin
    .from("profiles")
    .select("email")
    .eq("id", del.created_by)
    .maybeSingle();
  const ownerEmail = (owner as { email?: string | null } | null)?.email;
  if (!ownerEmail) return;

  try {
    const { sendEmail } = await import("@/lib/email");
    const link = del.project_id ? `/projects/${del.project_id}/deliverables` : "";
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    await sendEmail({
      to: ownerEmail,
      subject: `New ${label} on “${title}”`,
      html: `<p><strong>${author}</strong> left a ${label} on <strong>${title.replace(/</g, "&lt;")}</strong>:</p>
             <blockquote>${text.replace(/</g, "&lt;")}</blockquote>
             ${link ? `<p>Reply from your project: <a href="${siteUrl}${link}">${link}</a></p>` : ""}`,
    });
  } catch {
    /* best-effort */
  }
}
