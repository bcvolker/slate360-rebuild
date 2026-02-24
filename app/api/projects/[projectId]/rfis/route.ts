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
    .select("id, subject, question, status, created_at")
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
