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
    .select("id, title, spec_section, status, created_at")
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
