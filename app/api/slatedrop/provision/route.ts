/**
 * POST /api/slatedrop/provision
 * Creates the canonical 15 subfolders for a new project in project_folders.
 * Body: { projectId, projectName }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provisionProjectFolders } from "@/lib/slatedrop/provisioning";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, projectName } = await req.json() as {
    projectId: string;
    projectName: string;
  };
  if (!projectId || !projectName) {
    return NextResponse.json({ error: "projectId and projectName required" }, { status: 400 });
  }

  // Resolve org for this user
  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  const orgId: string | null = member?.org_id ?? null;

  let data: Awaited<ReturnType<typeof provisionProjectFolders>> = [];
  try {
    data = await provisionProjectFolders(projectId, projectName, orgId, user.id);
  } catch (error) {
    console.error("[slatedrop/provision]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to provision" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, folders: data });
}
