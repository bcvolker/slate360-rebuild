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
    .eq("scope", "project");

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
    return [];
  }

  const { data, error } = await admin.from("project_folders").insert(rows).select("id, name");
  if (error) {
    console.error("[provisioning] project_folders insert failed:", error.message, error.details, error.hint);
    throw new Error(`Folder provisioning failed: ${error.message}`);
  }
  return data;
}
