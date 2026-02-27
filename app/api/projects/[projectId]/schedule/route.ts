import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getScopedProjectForUser } from "@/lib/projects/access";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await admin
    .from("project_tasks")
    .select("id, name, start_date, end_date, status, percent_complete, assigned_to, priority, notes, is_milestone, created_at, updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    percentComplete?: number;
    assignedTo?: string;
    priority?: string;
    notes?: string;
    isMilestone?: boolean;
  };

  const name = String(body.name ?? "").trim();
  const startDate = String(body.startDate ?? "").trim();
  const endDate = String(body.endDate ?? "").trim();
  const status = String(body.status ?? "Not Started").trim() || "Not Started";

  if (!name) {
    return NextResponse.json({ error: "Task name is required" }, { status: 400 });
  }

  const percentComplete = Number(body.percentComplete ?? 0);
  const assignedTo = String(body.assignedTo ?? "").trim();
  const priority = String(body.priority ?? "Normal").trim();
  const notes = String(body.notes ?? "").trim();
  const isMilestone = Boolean(body.isMilestone ?? false);

  const { data, error } = await admin
    .from("project_tasks")
    .insert({
      project_id: projectId,
      name,
      start_date: startDate || null,
      end_date: endDate || null,
      status,
      percent_complete: percentComplete,
      assigned_to: assignedTo || null,
      priority,
      notes: notes || null,
      is_milestone: isMilestone,
    })
    .select("id, name, start_date, end_date, status, percent_complete, assigned_to, priority, notes, is_milestone, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, task: data });
}

/* ── PATCH – update a schedule task ───────────────────────────── */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Task id is required" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.startDate !== undefined) updates.start_date = body.startDate ? String(body.startDate) : null;
  if (body.endDate !== undefined) updates.end_date = body.endDate ? String(body.endDate) : null;
  if (body.status !== undefined) updates.status = String(body.status);
  if (body.percentComplete !== undefined) updates.percent_complete = Number(body.percentComplete) || 0;
  if (body.assignedTo !== undefined) updates.assigned_to = body.assignedTo ? String(body.assignedTo).trim() : null;
  if (body.priority !== undefined) updates.priority = String(body.priority);
  if (body.notes !== undefined) updates.notes = body.notes ? String(body.notes).trim() : null;
  if (body.isMilestone !== undefined) updates.is_milestone = Boolean(body.isMilestone);

  const { data, error } = await admin
    .from("project_tasks")
    .update(updates)
    .eq("id", id)
    .eq("project_id", projectId)
    .select("id, name, start_date, end_date, status, percent_complete, assigned_to, priority, notes, is_milestone, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, task: data });
}

/* ── DELETE – remove a schedule task ──────────────────────────── */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Task id is required" }, { status: 400 });

  const { error } = await admin
    .from("project_tasks")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
