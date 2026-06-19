import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { provisionProjectFolders } from "@/lib/slatedrop/provisioning";

type FolderRow = { id: string; name: string; folder_path: string | null; project_id: string };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const admin = createAdminClient();

  let orgId: string | null = null;
  try {
    const { data } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();
    orgId = data?.org_id ?? null;
  } catch {
    // solo user fallback
  }

  let query = admin
    .from("project_folders")
    .select("id, name, folder_path, project_id")
    .eq("project_id", projectId)
    .order("name", { ascending: true });

  query = orgId ? query.eq("org_id", orgId) : query.eq("created_by", user.id);

  const { data, error } = await query;
  if (error) {
    console.error("[slatedrop/project-folders]", error.message);
    return NextResponse.json({ folders: [] });
  }

  let rows = (data ?? []) as FolderRow[];

  // Lazy provision fallback: projects created before the folder taxonomy (or
  // where provisioning failed) have no folders, leaving nowhere to upload.
  // Provision on first view so every project always has its numbered subfolders.
  if (rows.length === 0) {
    const { project } = await getScopedProjectForUser(user.id, projectId, "id, name").catch(
      () => ({ project: null as { name?: string } | null }),
    );
    if (project) {
      try {
        const projectName = (project as { name?: string }).name ?? "Project";
        await provisionProjectFolders(projectId, projectName, orgId, user.id);
        const reread = await query;
        rows = (reread.data ?? []) as FolderRow[];
      } catch (provisionError) {
        console.error(
          "[slatedrop/project-folders] lazy provision failed",
          provisionError instanceof Error ? provisionError.message : provisionError,
        );
      }
    }
  }

  return NextResponse.json({
    folders: rows.map((folder) => ({
      id: folder.id,
      name: folder.name,
      path: folder.folder_path ?? folder.name,
      projectId: folder.project_id,
    })),
  });
}
