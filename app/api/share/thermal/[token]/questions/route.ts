import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveThermalShareToken } from "@/lib/thermal/share-token";

type Params = { params: Promise<{ token: string }> };

/**
 * Stakeholder Q&A on a shared thermal report.
 *  GET  → the question/answer thread for this share (so viewers see owner replies).
 *  POST → submit a question; notifies the owner by email (+ in-app bell when linked).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const gate = await resolveThermalShareToken(token);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: tokenRow } = await admin
    .from("thermal_analysis_share_tokens")
    .select("session_id")
    .eq("token", token)
    .maybeSingle();
  if (!tokenRow?.session_id) return NextResponse.json({ questions: [] });

  const { data: questions } = await admin
    .from("thermal_analysis_share_questions")
    .select("id, parent_id, author_name, body, is_owner_reply, created_at, capture_id")
    .eq("session_id", tokenRow.session_id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ questions: questions ?? [] });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const gate = await resolveThermalShareToken(token);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    body?: string;
    authorName?: string;
    authorEmail?: string;
    captureId?: string;
  } | null;
  const text = body?.body?.trim();
  if (!text) return NextResponse.json({ error: "A question is required" }, { status: 400 });

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: tokenRow } = await admin
    .from("thermal_analysis_share_tokens")
    .select("id, session_id, label")
    .eq("token", token)
    .maybeSingle();
  if (!tokenRow?.session_id) return NextResponse.json({ error: "Share unavailable" }, { status: 404 });

  const { data: session } = await admin
    .from("thermal_analysis_sessions")
    .select("id, name, org_id, project_id, created_by")
    .eq("id", tokenRow.session_id)
    .maybeSingle();

  const { data: inserted, error } = await admin
    .from("thermal_analysis_share_questions")
    .insert({
      share_token_id: tokenRow.id,
      session_id: tokenRow.session_id,
      org_id: session?.org_id ?? null,
      capture_id: body?.captureId ?? null,
      author_name: body?.authorName?.trim() || "Stakeholder",
      author_email: body?.authorEmail?.trim() || null,
      body: text,
      is_owner_reply: false,
      status: "new",
    })
    .select("id, author_name, body, created_at, capture_id, is_owner_reply, parent_id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notifyOwner(admin, session, text, body?.authorName?.trim() || "Stakeholder");

  return NextResponse.json({ ok: true, question: inserted });
}

async function notifyOwner(
  admin: SupabaseClient,
  session: { id: string; name: string | null; project_id: string | null; created_by: string | null } | null,
  text: string,
  author: string,
): Promise<void> {
  if (!session) return;
  const sessionName = session.name ?? "Thermal inspection";
  const link = `/operations-console/thermal/${session.id}`;

  // In-app bell — only possible when the session is linked to a project.
  if (session.project_id && session.created_by) {
    await admin
      .from("project_notifications")
      .insert({
        user_id: session.created_by,
        project_id: session.project_id,
        title: `New question on “${sessionName}”`,
        message: `${author}: ${text.slice(0, 140)}`,
      })
      .then(() => undefined, () => undefined);
  }

  // Email the owner (reliable regardless of project linkage).
  const ceoEmail = process.env.CEO_EMAIL;
  if (ceoEmail) {
    try {
      const { sendEmail } = await import("@/lib/email");
      await sendEmail({
        to: ceoEmail,
        subject: `New question on thermal share: ${sessionName}`,
        html: `<p><strong>${author}</strong> asked a question on <strong>${sessionName}</strong>:</p>
               <blockquote>${text.replace(/</g, "&lt;")}</blockquote>
               <p>Reply in the Operations Console: <a href="${process.env.SITE_URL ?? ""}${link}">${link}</a></p>`,
      });
    } catch {
      /* best-effort */
    }
  }
}
