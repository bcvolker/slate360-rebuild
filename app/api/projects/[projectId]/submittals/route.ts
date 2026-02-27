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
    .from("project_submittals")
    .select("id, title, spec_section, status, due_date, responsible_contractor, revision_number, lead_time_days, received_date, required_date, response_text, created_at, updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submittals: data ?? [] });
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
  const title = String(formData.get("title") ?? "").trim();
  const specSection = String(formData.get("spec_section") ?? "").trim();
  const status = String(formData.get("status") ?? "Pending").trim() || "Pending";
  const upload = formData.get("file");

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const { data: created, error: createError } = await admin
    .from("project_submittals")
    .insert({
      project_id: projectId,
      title,
      spec_section: specSection || null,
      status,
      created_by: user.id,
    })
    .select("id, title, spec_section, status, created_at")
    .single();

  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 });

  let artifact: unknown = null;
  if (upload instanceof File && upload.size > 0) {
    try {
      artifact = await saveProjectArtifact(
        project.id,
        project.name,
        "Submittal",
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
          submittal: created,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, submittal: created, artifact });
}

/* ── PATCH – update a submittal ─────────────────────────────────── */
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
  if (!id) return NextResponse.json({ error: "Submittal id is required" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = String(body.title).trim();
  if (body.spec_section !== undefined) updates.spec_section = body.spec_section ? String(body.spec_section).trim() : null;
  if (body.status !== undefined) updates.status = String(body.status);
  if (body.due_date !== undefined) updates.due_date = body.due_date ? String(body.due_date) : null;
  if (body.responsible_contractor !== undefined) updates.responsible_contractor = body.responsible_contractor ? String(body.responsible_contractor).trim() : null;
  if (body.revision_number !== undefined) updates.revision_number = Number(body.revision_number) || 0;
  if (body.lead_time_days !== undefined) updates.lead_time_days = body.lead_time_days ? Number(body.lead_time_days) : null;
  if (body.received_date !== undefined) updates.received_date = body.received_date ? String(body.received_date) : null;
  if (body.required_date !== undefined) updates.required_date = body.required_date ? String(body.required_date) : null;
  if (body.response_text !== undefined) updates.response_text = body.response_text ? String(body.response_text).trim() : null;

  const { data, error } = await admin
    .from("project_submittals")
    .update(updates)
    .eq("id", id)
    .eq("project_id", projectId)
    .select("id, title, spec_section, status, due_date, responsible_contractor, revision_number, lead_time_days, received_date, required_date, response_text, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, submittal: data });
}

/* ── DELETE – remove a submittal ────────────────────────────────── */
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
  if (!id) return NextResponse.json({ error: "Submittal id is required" }, { status: 400 });

  const { error } = await admin.from("project_submittals").delete().eq("id", id).eq("project_id", projectId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
