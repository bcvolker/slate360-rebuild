import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type ProjectFolder = {
  id: string;
  name: string;
  folder_path: string | null;
  parent_id: string | null;
};

type EnsureSiteWalkFolderParams = {
  admin: SupabaseClient;
  projectId: string;
  orgId: string;
  userId: string;
  childName: "Photos" | "Notes" | "Data" | "Plans" | "Deliverables";
};

export async function ensureSiteWalkProjectFolder({
  admin,
  projectId,
  orgId,
  userId,
  childName,
}: EnsureSiteWalkFolderParams): Promise<string | null> {
  const parent = await ensureFolder({
    admin,
    projectId,
    orgId,
    userId,
    name: "Site Walk Files",
    parentId: null,
    folderPath: `Projects/${projectId}/Site Walk Files`,
    folderType: "site_walk_files",
  });
  if (!parent) return null;

  const child = await ensureFolder({
    admin,
    projectId,
    orgId,
    userId,
    name: childName,
    parentId: parent.id,
    folderPath: `${parent.folder_path ?? `Projects/${projectId}/Site Walk Files`}/${childName}`,
    folderType: `site_walk_${childName.toLowerCase().replace(/\s+/g, "_")}`,
  });

  return child?.id ?? null;
}

async function ensureFolder(params: {
  admin: SupabaseClient;
  projectId: string;
  orgId: string;
  userId: string;
  name: string;
  parentId: string | null;
  folderPath: string;
  folderType: string;
}): Promise<ProjectFolder | null> {
  const { data: existing, error: lookupError } = await params.admin
    .from("project_folders")
    .select("id, name, folder_path, parent_id")
    .eq("project_id", params.projectId)
    .eq("org_id", params.orgId)
    .eq("name", params.name)
    .eq("parent_id", params.parentId)
    .maybeSingle<ProjectFolder>();

  if (lookupError) throw lookupError;
  if (existing) return existing;

  const { data: created, error: createError } = await params.admin
    .from("project_folders")
    .insert({
      project_id: params.projectId,
      parent_id: params.parentId,
      name: params.name,
      folder_path: params.folderPath,
      is_system: true,
      folder_type: params.folderType,
      scope: "project",
      is_public: false,
      allow_upload: true,
      allow_download: true,
      org_id: params.orgId,
      created_by: params.userId,
      metadata: { app: "site_walk" },
    })
    .select("id, name, folder_path, parent_id")
    .single<ProjectFolder>();

  if (createError) throw createError;
  return created ?? null;
}
