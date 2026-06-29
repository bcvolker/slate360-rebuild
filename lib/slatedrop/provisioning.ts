import { createAdminClient } from "@/lib/supabase/admin";
import { generateProjectFolderTree } from "@/lib/slatedrop/folder-generator";
import { LEGACY_PM_FOLDER_NAMES } from "@/lib/slatedrop/folder-taxonomy";

/** @deprecated Legacy flat folders — retained for resolver fallback only. */
export const PROJECT_SYSTEM_FOLDERS = LEGACY_PM_FOLDER_NAMES;

export async function provisionProjectFolders(
  projectId: string,
  projectName: string,
  orgId: string | null,
  userId: string,
  enabledApps?: ReadonlySet<string>,
) {
  const admin = createAdminClient();

  try {
    const folders = await generateProjectFolderTree(
      projectId,
      projectName,
      orgId,
      userId,
      admin,
      enabledApps,
    );
    return folders.map((row) => ({ id: row.id, name: row.name }));
  } catch (error) {
    console.error("[provisioning] folder tree failed:", error);
    throw error instanceof Error ? error : new Error("Folder provisioning failed");
  }
}
