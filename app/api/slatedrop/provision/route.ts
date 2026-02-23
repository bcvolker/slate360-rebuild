/**
 * POST /api/slatedrop/provision
 * Creates the canonical 15 subfolders for a new project in project_folders.
 * Body: { projectId, projectName }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_FOLDERS = [
  "Documents",
  "Drawings",
  "Photos",
  "3D Models",
  "360 Tours",
  "RFIs",
  "Submittals",
  "Schedule",
  "Budget",
  "Reports",
  "Safety",
  "Correspondence",
  "Closeout",
  "Daily Logs",
  "Misc",
];

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

  const rows = SYSTEM_FOLDERS.map((name) => ({
    name,
    folder_path: `Project Sandbox/${projectName}/${name}`,
    parent_id: projectId,
    is_system: true,
    folder_type: name.toLowerCase().replace(/\s+/g, "_"),
    is_public: false,
    allow_upload: true,
    org_id: orgId,
    created_by: user.id,
  }));

  const { data, error } = await supabase
    .from("project_folders")
    .insert(rows)
    .select("id, name");

  if (error) {
    console.error("[slatedrop/provision]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, folders: data });
}
