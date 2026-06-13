import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { PROJECT_FOLDER_TAXONOMY, type TaxonomyFolderNode } from "@/lib/slatedrop/folder-taxonomy";

type AdminClient = SupabaseClient;

type FolderRow = {
  id: string;
  name: string;
  folder_path: string | null;
  parent_id: string | null;
};

type ProvisionParams = {
  admin: AdminClient;
  projectId: string;
  projectName: string;
  orgId: string | null;
  userId: string;
};

async function ensureTaxonomyFolder(
  params: ProvisionParams & {
    node: TaxonomyFolderNode;
    parentId: string | null;
    parentPath: string;
    sortOrder: number;
    app?: string;
  },
): Promise<FolderRow> {
  const folderPath = `${params.parentPath}/${params.node.name}`;

  let lookup = params.admin
    .from("project_folders")
    .select("id, name, folder_path, parent_id")
    .eq("project_id", params.projectId)
    .eq("name", params.node.name);

  lookup = params.parentId ? lookup.eq("parent_id", params.parentId) : lookup.is("parent_id", null);
  lookup = lookup.limit(1);

  const { data: existing, error: lookupError } = await lookup.maybeSingle<FolderRow>();
  if (lookupError) throw new Error(`Folder provisioning lookup failed: ${lookupError.message}`);
  if (existing) return existing;

  const metadata: Record<string, unknown> = { project_name: params.projectName };
  if (params.app) metadata.app = params.app;

  const { data: created, error: createError } = await params.admin
    .from("project_folders")
    .insert({
      name: params.node.name,
      folder_path: folderPath,
      project_id: params.projectId,
      parent_id: params.parentId,
      is_system: true,
      folder_type: params.node.folderType,
      scope: "project",
      is_public: false,
      allow_upload: true,
      allow_download: true,
      org_id: params.orgId,
      created_by: params.userId,
      sort_order: params.sortOrder,
      metadata,
    })
    .select("id, name, folder_path, parent_id")
    .single<FolderRow>();

  if (createError || !created) {
    throw new Error(`Folder provisioning failed: ${createError?.message ?? "Unknown error"}`);
  }

  return created;
}

async function provisionNodeTree(
  params: ProvisionParams,
  node: TaxonomyFolderNode,
  parentId: string | null,
  parentPath: string,
  sortOrder: number,
): Promise<FolderRow[]> {
  const app =
    node.name === "02_Site_Walk"
      ? "site_walk"
      : node.name === "03_Digital_Twin"
        ? "digital_twin"
        : undefined;

  const created = await ensureTaxonomyFolder({
    ...params,
    node,
    parentId,
    parentPath,
    sortOrder,
    app,
  });

  const rows: FolderRow[] = [created];
  const children = node.children ?? [];

  await Promise.all(
    children.map((child, index) =>
      provisionNodeTree(
        params,
        child,
        created.id,
        created.folder_path ?? `${parentPath}/${node.name}`,
        sortOrder + index + 1,
      ).then((childRows) => {
        rows.push(...childRows);
      }),
    ),
  );

  return rows;
}

/**
 * Creates the numbered folder tree (01_Project_Info … 05_Team_Shared) for a project.
 * Idempotent — skips folders that already exist.
 */
export async function generateProjectFolderTree(
  projectId: string,
  projectName: string,
  orgId: string | null,
  userId: string,
  admin: AdminClient,
): Promise<FolderRow[]> {
  const basePath = `Projects/${projectId}`;
  const params: ProvisionParams = { admin, projectId, projectName, orgId, userId };

  const results = await Promise.all(
    PROJECT_FOLDER_TAXONOMY.map((root, index) =>
      provisionNodeTree(params, root, null, basePath, (index + 1) * 100),
    ),
  );

  return results.flat();
}
