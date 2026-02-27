import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getScopedProjectForUser, resolveProjectScope } from "@/lib/projects/access";

type RouteContext = { params: Promise<{ projectId: string }> };

const SELECT =
  "id, number, title, description, status, priority, assignee, location_area, trade_category, due_date, photos, created_by, created_at, updated_at, completed_at";

/* ── GET – list all punch items for a project ───────────────────── */
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
    .from("project_punch_items")
    .select(SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

/* ── POST – create a new punch item ─────────────────────────────── */
export async function POST(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const { data, error } = await admin
    .from("project_punch_items")
    .insert({
      project_id: projectId,
      title,
      description: body.description ? String(body.description).trim() : null,
      status: body.status ? String(body.status) : "Open",
      priority: body.priority ? String(body.priority) : "Medium",
      assignee: body.assignee ? String(body.assignee).trim() : null,
      location_area: body.location_area ? String(body.location_area).trim() : null,
      trade_category: body.trade_category ? String(body.trade_category).trim() : null,
      due_date: body.due_date ? String(body.due_date) : null,
      photos: Array.isArray(body.photos) ? body.photos : [],
      created_by: user.id,
    })
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: data });
}

/* ── PATCH – update a punch item ────────────────────────────────── */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const itemId = String(body.id ?? "").trim();
  if (!itemId) return NextResponse.json({ error: "Item id is required" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.title !== undefined) updates.title = String(body.title).trim();
  if (body.description !== undefined) updates.description = body.description ? String(body.description).trim() : null;
  if (body.status !== undefined) {
    updates.status = String(body.status);
    if (body.status === "Closed") updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;
  }
  if (body.priority !== undefined) updates.priority = String(body.priority);
  if (body.assignee !== undefined) updates.assignee = body.assignee ? String(body.assignee).trim() : null;
  if (body.location_area !== undefined) updates.location_area = body.location_area ? String(body.location_area).trim() : null;
  if (body.trade_category !== undefined) updates.trade_category = body.trade_category ? String(body.trade_category).trim() : null;
  if (body.due_date !== undefined) updates.due_date = body.due_date ? String(body.due_date) : null;
  if (body.photos !== undefined && Array.isArray(body.photos)) updates.photos = body.photos;

  const { data, error } = await admin
    .from("project_punch_items")
    .update(updates)
    .eq("id", itemId)
    .eq("project_id", projectId)
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: data });
}

/* ── DELETE – remove a punch item ───────────────────────────────── */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin } = await resolveProjectScope(user.id);
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const itemId = String(body.id ?? "").trim();
  if (!itemId) return NextResponse.json({ error: "Item id is required" }, { status: 400 });

  const { error } = await admin
    .from("project_punch_items")
    .delete()
    .eq("id", itemId)
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
