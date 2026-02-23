import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
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

  let projectsQuery = admin
    .from("projects")
    .select("id, name, description, status, created_at")
    .order("created_at", { ascending: false });

  projectsQuery = orgId ? projectsQuery.eq("org_id", orgId) : projectsQuery.eq("created_by", user.id);

  const { data: projects, error: projectError } = await projectsQuery;
  if (projectError) {
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }

  const projectIds = (projects ?? []).map((project) => project.id);
  if (projectIds.length === 0) {
    return NextResponse.json({ projects: [] });
  }

  let folders: Array<{ id: string; name: string; project_id: string; is_system: boolean; folder_path: string | null }> = [];

  try {
    let foldersQuery = admin
      .from("project_folders")
      .select("id, name, project_id, is_system, folder_path")
      .in("project_id", projectIds)
      .order("name", { ascending: true });

    foldersQuery = orgId ? foldersQuery.eq("org_id", orgId) : foldersQuery.eq("created_by", user.id);

    const { data } = await foldersQuery;
    folders = data ?? [];
  } catch (folderError) {
    // project_folders table may not exist yet — return projects without folder tree
    console.error("[api/projects/sandbox] folder query error:", folderError);
  }

  const folderMap: Record<string, Array<{ id: string; name: string; isSystem: boolean; path: string | null }>> = {};
  for (const folder of folders) {
    const key = folder.project_id;
    if (!folderMap[key]) folderMap[key] = [];
    folderMap[key].push({
      id: folder.id,
      name: folder.name,
      isSystem: Boolean(folder.is_system),
      path: folder.folder_path ?? null,
    });
  }

  return NextResponse.json({
    projects: (projects ?? []).map((project) => ({
      ...project,
      folders: folderMap[project.id] ?? [],
    })),
  });
}
