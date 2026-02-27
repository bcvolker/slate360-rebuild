import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getScopedProjectForUser, resolveProjectScope } from "@/lib/projects/access";
import { saveProjectArtifact } from "@/lib/slatedrop/projectArtifacts";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const { data, error } = await admin
    .from("project_rfis")
    .select("id, subject, question, status, priority, assigned_to, ball_in_court, due_date, cost_impact, schedule_impact, distribution, response_text, created_at, updated_at, closed_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rfis: data ?? [] });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin, orgId } = await resolveProjectScope(user.id);
  const { project: scopedProject } = await getScopedProjectForUser(user.id, projectId, "id, name");
  const project = scopedProject as { id: string; name: string } | null;
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const formData = await req.formData();
  const subject = String(formData.get("subject") ?? "").trim();
  const question = String(formData.get("question") ?? "").trim();
  const status = String(formData.get("status") ?? "Open").trim() || "Open";
  const upload = formData.get("file");

  if (!subject || !question) {
    return NextResponse.json({ error: "Subject and question are required" }, { status: 400 });
  }

  const { data: created, error: createError } = await admin
    .from("project_rfis")
    .insert({
      project_id: projectId,
      subject,
      question,
      status,
      created_by: user.id,
    })
    .select("id, subject, question, status, created_at")
    .single();

  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 });

  let artifact: unknown = null;
  if (upload instanceof File && upload.size > 0) {
    try {
      artifact = await saveProjectArtifact(
        project.id,
        project.name,
        "RFI",
        {
          name: upload.name,
          type: upload.type,
          size: upload.size,
          arrayBuffer: () => upload.arrayBuffer(),
        },
        { id: user.id },
        orgId
      );
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to upload attachment",
          rfi: created,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, rfi: created, artifact });
}

/* ── PATCH – update an RFI ──────────────────────────────────────── */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "RFI id is required" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.subject !== undefined) updates.subject = String(body.subject).trim();
  if (body.question !== undefined) updates.question = String(body.question).trim();
  if (body.status !== undefined) {
    updates.status = String(body.status);
    if (body.status === "Closed") updates.closed_at = new Date().toISOString();
    else updates.closed_at = null;
  }
  if (body.priority !== undefined) updates.priority = String(body.priority);
  if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to ? String(body.assigned_to).trim() : null;
  if (body.ball_in_court !== undefined) updates.ball_in_court = body.ball_in_court ? String(body.ball_in_court).trim() : null;
  if (body.due_date !== undefined) updates.due_date = body.due_date ? String(body.due_date) : null;
  if (body.cost_impact !== undefined) updates.cost_impact = Number(body.cost_impact) || 0;
  if (body.schedule_impact !== undefined) updates.schedule_impact = Number(body.schedule_impact) || 0;
  if (body.response_text !== undefined) updates.response_text = body.response_text ? String(body.response_text).trim() : null;
  if (body.distribution !== undefined && Array.isArray(body.distribution)) updates.distribution = body.distribution;

  const { data, error } = await admin
    .from("project_rfis")
    .update(updates)
    .eq("id", id)
    .eq("project_id", projectId)
    .select("id, subject, question, status, priority, assigned_to, ball_in_court, due_date, cost_impact, schedule_impact, distribution, response_text, created_at, updated_at, closed_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rfi: data });
}

/* ── DELETE – remove an RFI ─────────────────────────────────────── */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "RFI id is required" }, { status: 400 });

  const { error } = await admin.from("project_rfis").delete().eq("id", id).eq("project_id", projectId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
