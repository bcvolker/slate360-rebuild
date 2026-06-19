import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSiteWalkShareToken } from "@/components/external-portal/resolve-site-walk-share-token";

type Params = { params: Promise<{ token: string }> };

/**
 * Two-way Q&A on a shared deliverable (public, token-gated).
 *  GET  → the question/answer thread (viewers see owner replies).
 *  POST → submit a question.
 */
type DeliverableOwner = {
  id: string;
  org_id: string | null;
  title: string | null;
  project_id: string | null;
  created_by: string | null;
};

async function deliverableForToken(admin: ReturnType<typeof createAdminClient>, token: string) {
  const { data } = await admin
    .from("site_walk_deliverables")
    .select("id, org_id, title, project_id, created_by")
    .eq("share_token", token)
    .maybeSingle();
  return data as DeliverableOwner | null;
}

/**
 * Best-effort owner notification when a viewer asks a question: in-app bell
 * (when the deliverable is linked to a project) plus an email to the owner.
 * Mirrors the thermal share Q&A notify flow.
 */
async function notifyOwner(
  admin: ReturnType<typeof createAdminClient>,
  del: DeliverableOwner,
  text: string,
  author: string,
): Promise<void> {
  const title = del.title ?? "your deliverable";

  if (del.project_id && del.created_by) {
    await admin
      .from("project_notifications")
      .insert({
        user_id: del.created_by,
        project_id: del.project_id,
        title: `New question on “${title}”`,
        message: `${author}: ${text.slice(0, 140)}`,
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
      subject: `New question on “${title}”`,
      html: `<p><strong>${author}</strong> asked a question on <strong>${title.replace(/</g, "&lt;")}</strong>:</p>
             <blockquote>${text.replace(/</g, "&lt;")}</blockquote>
             ${link ? `<p>Reply from your project: <a href="${siteUrl}${link}">${link}</a></p>` : ""}`,
    });
  } catch {
    /* best-effort */
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const gate = await resolveSiteWalkShareToken(token);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });

  const admin = createAdminClient();
  const del = await deliverableForToken(admin, token);
  if (!del) return NextResponse.json({ questions: [] });

  const { data } = await admin
    .from("site_walk_deliverable_questions")
    .select("id, parent_id, author_name, body, is_owner_reply, created_at")
    .eq("deliverable_id", del.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ questions: data ?? [] });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const gate = await resolveSiteWalkShareToken(token);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    body?: string;
    authorName?: string;
    authorEmail?: string;
    parentId?: string;
  } | null;
  const text = body?.body?.trim();
  if (!text) return NextResponse.json({ error: "A question is required" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Question is too long" }, { status: 400 });

  const admin = createAdminClient();
  const del = await deliverableForToken(admin, token);
  if (!del) return NextResponse.json({ error: "Share unavailable" }, { status: 404 });

  const { data: inserted, error } = await admin
    .from("site_walk_deliverable_questions")
    .insert({
      deliverable_id: del.id,
      org_id: del.org_id ?? null,
      parent_id: body?.parentId ?? null,
      author_name: body?.authorName?.trim() || "Viewer",
      author_email: body?.authorEmail?.trim() || null,
      body: text,
      is_owner_reply: false,
      status: "new",
    })
    .select("id, parent_id, author_name, body, is_owner_reply, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notifyOwner(admin, del, text, body?.authorName?.trim() || "A viewer");

  return NextResponse.json({ ok: true, question: inserted });
}
