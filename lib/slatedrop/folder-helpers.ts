import type { SupabaseClient } from "@supabase/supabase-js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";
import { resolveNamespace } from "@/lib/slatedrop/storage";

export type FolderRow = {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  folder_path: string | null;
  is_system: boolean | null;
  org_id: string | null;
  created_by: string | null;
};

export function sanitizeSegment(name: string): string {
  return name
    .trim()
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

export function buildFolderTreeIds(rows: FolderRow[], rootId: string): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.parent_id) continue;
    const arr = childrenByParent.get(row.parent_id) ?? [];
    arr.push(row.id);
    childrenByParent.set(row.parent_id, arr);
  }

  const output: string[] = [];
  const stack: string[] = [rootId];

  while (stack.length > 0) {
    const currentId = stack.pop() as string;
    output.push(currentId);
    const children = childrenByParent.get(currentId) ?? [];
    for (const child of children) {
      stack.push(child);
    }
  }

  return output;
}

/** Recursively delete a folder and all its children + files. */
export async function deleteFolderTree(
  admin: SupabaseClient,
  folder: FolderRow,
  orgId: string | null,
  userId: string,
): Promise<{ ok: boolean; deletedFolderIds: string[]; error?: string }> {
  const { data: allProjectFolders } = await admin
    .from("project_folders")
    .select("id, project_id, parent_id, name, folder_path, is_system, org_id, created_by")
    .eq("project_id", folder.project_id);

  const rows = (allProjectFolders ?? []) as FolderRow[];
  const folderIds = buildFolderTreeIds(rows, folder.id);

  const namespace = resolveNamespace(orgId, userId);
  const prefixFilters = folderIds.map((id) => `s3_key.like.orgs/${namespace}/${id}/%`);

  let filesQuery = admin.from("slatedrop_uploads").select("id, s3_key").neq("status", "deleted");
  if (prefixFilters.length > 0 && prefixFilters.length <= 50) {
    filesQuery = filesQuery.or(prefixFilters.join(","));
  }
  filesQuery = orgId ? filesQuery.eq("org_id", orgId) : filesQuery.eq("uploaded_by", userId);

  const { data: files } = await filesQuery;

  for (const file of files ?? []) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: file.s3_key }));
    } catch {
      // best effort
    }
  }

  if ((files ?? []).length > 0) {
    const fileIds = (files ?? []).map((file) => file.id);
    await admin.from("slatedrop_uploads").update({ status: "deleted" }).in("id", fileIds);
  }

  const { error: deleteError } = await admin.from("project_folders").delete().in("id", folderIds);
  if (deleteError) {
    return { ok: false, deletedFolderIds: [], error: deleteError.message };
  }

  return { ok: true, deletedFolderIds: folderIds };
}
