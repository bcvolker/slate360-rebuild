import { createAdminClient } from "@/lib/supabase/admin";

export const PROJECT_SYSTEM_FOLDERS = [
  "Documents",
  "Drawings",
  "Photos",
  "3D Models",
  "360 Tours",
  "RFIs",
  "Submittals",
  "Schedule",
  "Budget",
  "Daily Logs",
  "Reports",
  "Records",
  "Safety",
  "Correspondence",
  "Closeout",
  "Deliverables",
  "Misc",
] as const;

const SITE_WALK_CHILD_FOLDERS = ["Photos", "Notes", "Data", "Plans", "Deliverables"] as const;

type ProjectFolderRow = {
  id: string;
  name: string;
  folder_path: string | null;
  parent_id: string | null;
};

function toFolderType(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_");
}

export async function provisionProjectFolders(
  projectId: string,
  projectName: string,
  orgId: string | null,
  userId: string
) {
  const admin = createAdminClient();

  const { data: existingRows, error: existingError } = await admin
    .from("project_folders")
    .select("name")
    .eq("project_id", projectId)
    .eq("scope", "project")
    .is("parent_id", null);

  if (existingError) {
    console.error("[provisioning] project_folders lookup failed:", existingError.message, existingError.details, existingError.hint);
    throw new Error(`Folder provisioning lookup failed: ${existingError.message}`);
  }

  const existingNames = new Set((existingRows ?? []).map((row) => String(row.name ?? "")));

  const rows = PROJECT_SYSTEM_FOLDERS.filter((name) => !existingNames.has(name)).map((name, idx) => ({
    name,
    folder_path: `Projects/${projectId}/${name}`,
    project_id: projectId,
    is_system: true,
    folder_type: toFolderType(name),
    scope: "project",
    is_public: false,
    allow_upload: true,
    org_id: orgId,
    created_by: userId,
    sort_order: PROJECT_SYSTEM_FOLDERS.indexOf(name) + idx,
    metadata: {
      project_name: projectName,
    },
  }));

  if (rows.length === 0) {
    await ensureSiteWalkFolderTree({ admin, projectId, projectName, orgId, userId });
    return [];
  }

  const { data, error } = await admin.from("project_folders").insert(rows).select("id, name");
  if (error) {
    console.error("[provisioning] project_folders insert failed:", error.message, error.details, error.hint);
    throw new Error(`Folder provisioning failed: ${error.message}`);
  }
  await ensureSiteWalkFolderTree({ admin, projectId, projectName, orgId, userId });
  return data;
}

async function ensureSiteWalkFolderTree(params: {
  admin: ReturnType<typeof createAdminClient>;
  projectId: string;
  projectName: string;
  orgId: string | null;
  userId: string;
}) {
  const parent = await ensureProjectFolder({
    ...params,
    name: "Site Walk Files",
    parentId: null,
    folderPath: `Projects/${params.projectId}/Site Walk Files`,
    folderType: "site_walk_files",
    sortOrder: 100,
  });

  await Promise.all(SITE_WALK_CHILD_FOLDERS.map((name, index) => ensureProjectFolder({
    ...params,
    name,
    parentId: parent.id,
    folderPath: `${parent.folder_path ?? `Projects/${params.projectId}/Site Walk Files`}/${name}`,
    folderType: `site_walk_${toFolderType(name)}`,
    sortOrder: 101 + index,
  })));
}

async function ensureProjectFolder(params: {
  admin: ReturnType<typeof createAdminClient>;
  projectId: string;
  projectName: string;
  orgId: string | null;
  userId: string;
  name: string;
  parentId: string | null;
  folderPath: string;
  folderType: string;
  sortOrder: number;
}): Promise<ProjectFolderRow> {
  let lookup = params.admin
    .from("project_folders")
    .select("id, name, folder_path, parent_id")
    .eq("project_id", params.projectId)
    .eq("name", params.name);

  lookup = params.parentId ? lookup.eq("parent_id", params.parentId) : lookup.is("parent_id", null);
  lookup = lookup.limit(1);
  const { data: existing, error: lookupError } = await lookup.maybeSingle<ProjectFolderRow>();
  if (lookupError) throw new Error(`Folder provisioning lookup failed: ${lookupError.message}`);
  if (existing) return existing;

  const { data: created, error: createError } = await params.admin
    .from("project_folders")
    .insert({
      name: params.name,
      folder_path: params.folderPath,
      project_id: params.projectId,
      parent_id: params.parentId,
      is_system: true,
      folder_type: params.folderType,
      scope: "project",
      is_public: false,
      allow_upload: true,
      allow_download: true,
      org_id: params.orgId,
      created_by: params.userId,
      sort_order: params.sortOrder,
      metadata: { project_name: params.projectName, app: "site_walk" },
    })
    .select("id, name, folder_path, parent_id")
    .single<ProjectFolderRow>();

  if (createError || !created) throw new Error(`Folder provisioning failed: ${createError?.message ?? "Unknown error"}`);
  return created;
}
