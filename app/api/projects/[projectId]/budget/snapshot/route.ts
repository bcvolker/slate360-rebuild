import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getScopedProjectForUser, resolveProjectScope } from "@/lib/projects/access";
import { saveProjectArtifact } from "@/lib/slatedrop/projectArtifacts";

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

  const { orgId } = await resolveProjectScope(user.id);
  const { project: scopedProject } = await getScopedProjectForUser(user.id, projectId, "id, name");
  const project = scopedProject as { id: string; name: string } | null;
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const formData = await req.formData();
  const upload = formData.get("file");
  if (!(upload instanceof File) || upload.size === 0) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
  }

  const filename = upload.name || `budget-snapshot-${new Date().toISOString().slice(0, 10)}.csv`;

  const artifact = await saveProjectArtifact(
    project.id,
    project.name,
    "Budget",
    {
      name: filename,
      type: "text/csv",
      size: upload.size,
      arrayBuffer: () => upload.arrayBuffer(),
    },
    { id: user.id },
    orgId
  );

  return NextResponse.json({ ok: true, artifact });
}
