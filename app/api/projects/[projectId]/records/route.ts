import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveProjectArtifact, type ProjectArtifactKind } from "@/lib/slatedrop/projectArtifacts";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

function safeToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { projectId } = await context.params;

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let orgId: string | null = null;
  try {
    const { data } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();
    orgId = data?.org_id ?? null;
  } catch {
    orgId = null;
  }

  let projectQuery = admin
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .limit(1);

  projectQuery = orgId ? projectQuery.eq("org_id", orgId) : projectQuery.eq("created_by", user.id);

  const { data: project } = await projectQuery.single();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    kind?: ProjectArtifactKind;
    title?: string;
    content?: string;
  };

  const kind = body.kind;
  const content = body.content?.trim();
  const title = body.title?.trim() || kind || "record";

  if (!kind || (kind !== "DailyLog" && kind !== "PunchList")) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const stamp = new Date().toISOString().replace(/[:]/g, "-");
  const filename = `${safeToken(kind.toLowerCase())}-${stamp}-${safeToken(title) || "entry"}.txt`;

  const text = [
    `Project: ${project.name}`,
    `Kind: ${kind}`,
    `Title: ${title}`,
    `CreatedAt: ${new Date().toISOString()}`,
    "",
    content,
  ].join("\n");

  const bytes = new TextEncoder().encode(text);

  try {
    const artifact = await saveProjectArtifact(
      project.id,
      project.name,
      kind,
      {
        name: filename,
        type: "text/plain",
        size: bytes.byteLength,
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      },
      { id: user.id },
      orgId
    );

    return NextResponse.json({ ok: true, artifact });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save project record";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
