import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listScopedProjectsForUser, resolveProjectScope } from "@/lib/projects/access";
import { provisionProjectFolders } from "@/lib/slatedrop/provisioning";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { admin, orgId } = await resolveProjectScope(user.id);
  const { projects, error: projectError } = await listScopedProjectsForUser(user.id);
  if (projectError) {
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }

  const projectIds = (projects ?? []).map((project) => project.id);
  if (projectIds.length === 0) {
    return NextResponse.json({ projects: [] });
  }

  let folders: Array<{ id: string; name: string; project_id: string; is_system: boolean; folder_path: string | null }> = [];

  try {
    const foldersQuery = admin
      .from("project_folders")
      .select("id, name, project_id, is_system, folder_path")
      .in("project_id", projectIds)
      .order("name", { ascending: true });

    const { data } = await foldersQuery;
    folders = data ?? [];
  } catch (folderError) {
    // project_folders table may not exist yet — return projects without folder tree
    console.error("[api/projects/sandbox] folder query error:", folderError);
  }

  const folderCountByProject = new Map<string, number>();
  for (const folder of folders) {
    folderCountByProject.set(folder.project_id, (folderCountByProject.get(folder.project_id) ?? 0) + 1);
  }

  const missingFolderProjects = (projects ?? []).filter((project) => (folderCountByProject.get(project.id) ?? 0) === 0);

  if (missingFolderProjects.length > 0) {
    for (const project of missingFolderProjects) {
      try {
        await provisionProjectFolders(project.id, project.name, project.org_id ?? orgId, project.created_by);
      } catch (error) {
        console.error("[api/projects/sandbox] auto-provision failed:", project.id, error);
      }
    }

    try {
      const { data: refreshed } = await admin
        .from("project_folders")
        .select("id, name, project_id, is_system, folder_path")
        .in("project_id", projectIds)
        .order("name", { ascending: true });

      folders = refreshed ?? folders;
    } catch {
      // keep previous folder state
    }
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
