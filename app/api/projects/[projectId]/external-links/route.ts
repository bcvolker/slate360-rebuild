import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getScopedProjectForUser, resolveProjectScope } from "@/lib/projects/access";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id, name");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const projectName =
    typeof project === "object" &&
    project !== null &&
    "name" in project &&
    typeof (project as { name?: unknown }).name === "string"
      ? (project as { name: string }).name
      : "Project";

  const body = (await req.json().catch(() => ({}))) as {
    targetType?: "RFI" | "Submittal" | "Document";
    targetId?: string;
    expiresInDays?: number;
    recipientEmail?: string;
    recipientName?: string;
    message?: string;
  };

  const targetType = body.targetType;
  const targetId = String(body.targetId ?? "").trim();
  const expiresInDays = Number(body.expiresInDays ?? 14);
  const recipientEmail = String(body.recipientEmail ?? "").trim();
  const recipientName = String(body.recipientName ?? "").trim();
  const message = String(body.message ?? "").trim();

  if ((targetType !== "RFI" && targetType !== "Submittal" && targetType !== "Document") || !targetId) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + Math.max(1, expiresInDays) * 24 * 60 * 60 * 1000).toISOString();
  const token = randomUUID().replace(/-/g, "");

  const { error } = await admin.from("project_external_links").insert({
    project_id: projectId,
    target_type: targetType,
    target_id: targetId,
    token,
    expires_at: expiresAt,
    is_active: true,
    created_by: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = req.nextUrl.origin;
  const responseUrl = `${origin}/external/respond/${token}`;

  let itemTitle = `${targetType} ${targetId}`;

  if (targetType === "RFI") {
    const { data } = await admin
      .from("project_rfis")
      .select("subject")
      .eq("id", targetId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (data?.subject) itemTitle = data.subject;
  } else {
    const { data } = await admin
      .from("project_submittals")
      .select("title")
      .eq("id", targetId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (data?.title) itemTitle = data.title;
  }

  if (targetType !== "RFI") {
    await admin
      .from("project_submittals")
      .update({
        stakeholder_email: recipientEmail || null,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetId)
      .eq("project_id", projectId);
  }

  if (recipientEmail) {
    const emailRes = await fetch(`${origin}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "external-response-request",
        to: recipientEmail,
        senderName: recipientName || "Slate360 Team",
        projectName,
        itemType: targetType,
        itemTitle,
        responseUrl,
        expiresAt,
        message: message || undefined,
      }),
    });

    if (!emailRes.ok) {
      const payload = (await emailRes.json().catch(() => ({}))) as { error?: string };
      return NextResponse.json({ error: payload.error ?? "Failed to send email" }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    token,
    url: responseUrl,
    emailed: Boolean(recipientEmail),
    expiresAt,
  });
}
