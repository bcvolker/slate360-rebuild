import { createAdminClient } from "@/lib/supabase/admin";

export async function provisionProjectFolders(
  projectId: string,
  projectName: string,
  orgId: string | null,
  userId: string
) {
  const admin = createAdminClient();
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

  const rows = SYSTEM_FOLDERS.map((name) => ({
    name,
    folder_path: `Project Sandbox/${projectName}/${name}`,
    parent_id: projectId,
    is_system: true,
    folder_type: name.toLowerCase().replace(/\s+/g, "_"),
    is_public: false,
    allow_upload: true,
    org_id: orgId,
    created_by: userId,
  }));

  const { data, error } = await admin.from("project_folders").insert(rows).select("id, name");
  if (error) {
    console.error("[provisioning] project_folders insert failed:", error.message, error.details, error.hint);
    throw new Error(`Folder provisioning failed: ${error.message}`);
  }
  return data;
}
