import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getScopedProjectForUser } from "@/lib/projects/access";

type Params = { projectId: string };

async function authorize(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) return { user: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { user, error: null };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const { projectId } = await params;
  const { error } = await authorize(projectId);
  if (error) return error;
  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("project_stakeholders")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ stakeholders: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  const { projectId } = await params;
  const { error } = await authorize(projectId);
  if (error) return error;
  const body = await req.json() as Record<string, unknown>;
  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("project_stakeholders")
    .insert({
      project_id: projectId,
      name:         String(body.name ?? ""),
      role:         String(body.role ?? ""),
      company:      body.company ? String(body.company) : null,
      email:        body.email   ? String(body.email)   : null,
      phone:        body.phone   ? String(body.phone)   : null,
      address:      body.address ? String(body.address) : null,
      license_no:   body.license_no ? String(body.license_no) : null,
      notes:        body.notes   ? String(body.notes)   : null,
      status:       String(body.status ?? "Active"),
    })
    .select()
    .single();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ stakeholder: data }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<Params> }) {
  const { projectId } = await params;
  const { error } = await authorize(projectId);
  if (error) return error;
  const body = await req.json() as Record<string, unknown>;
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("project_stakeholders")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", String(id))
    .eq("project_id", projectId)
    .select()
    .single();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ stakeholder: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<Params> }) {
  const { projectId } = await params;
  const { error } = await authorize(projectId);
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const admin = createAdminClient();
  const { error: dbErr } = await admin
    .from("project_stakeholders")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
