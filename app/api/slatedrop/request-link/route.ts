import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function makeToken() {
  return randomBytes(24).toString("hex");
}

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
    projectId?: string;
    folderId?: string;
    expiresAt?: string | null;
  };

  const projectId = body.projectId?.trim();
  const folderId = body.folderId?.trim();
  const expiresAt = body.expiresAt ? new Date(body.expiresAt).toISOString() : null;

  if (!projectId || !folderId) {
    return NextResponse.json({ error: "projectId and folderId are required" }, { status: 400 });
  }

  const { data: project } = await admin
    .from("projects")
    .select("id, org_id")
    .eq("id", projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: membership } = await admin
    .from("organization_members")
    .select("org_id")
    .eq("org_id", project.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = makeToken();

  const { data: linkRow, error } = await admin
    .from("project_external_links")
    .insert({
      project_id: projectId,
      folder_id: folderId,
      token,
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select("id, token, expires_at")
    .single();

  if (error || !linkRow) {
    return NextResponse.json({ error: "Failed to create request link" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    token: linkRow.token,
    url: `/upload/${linkRow.token}`,
    expiresAt: linkRow.expires_at,
  });
}
