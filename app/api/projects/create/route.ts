import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionProjectFolders } from "@/lib/slatedrop/provisioning";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  };

  const name = body.name?.trim();
  const description = body.description?.trim() || null;
  const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};

  if (!name) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
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

  const { data: createdProject, error: projectError } = await admin
    .from("projects")
    .insert({
      org_id: orgId,
      name,
      description,
      metadata,
      status: "active",
      created_by: user.id,
    })
    .select("id, name, description, metadata, status, created_at")
    .single();

  if (projectError || !createdProject) {
    console.error("[api/projects/create] project insert failed", projectError?.message);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }

  const { error: memberError } = await admin.from("project_members").insert({
    project_id: createdProject.id,
    user_id: user.id,
    role_id: "owner",
    status: "active",
  });

  if (memberError) {
    await admin.from("projects").delete().eq("id", createdProject.id).eq("org_id", orgId);
    console.error("[api/projects/create] project member insert failed", memberError.message);
    return NextResponse.json({ error: "Failed to create project membership" }, { status: 500 });
  }

  try {
    await provisionProjectFolders(createdProject.id, createdProject.name, orgId, user.id);
  } catch (provisionError) {
    await admin.from("project_members").delete().eq("project_id", createdProject.id).eq("user_id", user.id);
    await admin.from("projects").delete().eq("id", createdProject.id).eq("org_id", orgId);
    console.error("[api/projects/create] folder provisioning failed", provisionError);
    return NextResponse.json(
      { error: "Project created but folder provisioning failed. Project was rolled back." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    project: createdProject,
  });
}
