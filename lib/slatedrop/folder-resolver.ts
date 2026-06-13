import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LEGACY_ARTIFACT_FOLDER_PATHS,
  SITE_WALK_ROOT,
  type SiteWalkCaptureFolder,
} from "@/lib/slatedrop/folder-taxonomy";

type FolderRow = { id: string };

type ResolveContext = {
  admin: SupabaseClient;
  projectId: string;
  orgId: string | null;
  userId: string;
};

async function lookupFolderByParent(
  ctx: ResolveContext,
  name: string,
  parentId: string | null,
): Promise<FolderRow | null> {
  let query = ctx.admin
    .from("project_folders")
    .select("id")
    .eq("project_id", ctx.projectId)
    .eq("name", name);

  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);
  query = ctx.orgId ? query.eq("org_id", ctx.orgId) : query.eq("created_by", ctx.userId);
  query = query.limit(1);

  const { data, error } = await query.maybeSingle<FolderRow>();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Resolves a folder id by walking numbered taxonomy path segments
 * (e.g. ["02_Site_Walk", "Photos"]).
 */
export async function resolveProjectFolderPath(
  ctx: ResolveContext,
  pathSegments: readonly string[],
): Promise<string | null> {
  if (!pathSegments.length) return null;

  let parentId: string | null = null;
  for (const segment of pathSegments) {
    const row = await lookupFolderByParent(ctx, segment, parentId);
    if (!row) return null;
    parentId = row.id;
  }

  return parentId;
}

/** Legacy Site Walk Files / {child} → 02_Site_Walk / {child}. */
const LEGACY_SITE_WALK_CHILD_ALIASES: Record<SiteWalkCaptureFolder, SiteWalkCaptureFolder> = {
  Photos: "Photos",
  Notes: "Notes",
  Voice_Memos: "Voice_Memos",
  Plans: "Plans",
  Deliverables: "Deliverables",
  Data: "Data",
};

export async function resolveSiteWalkCaptureFolder(
  ctx: ResolveContext,
  child: SiteWalkCaptureFolder,
): Promise<string | null> {
  const taxonomyId = await resolveProjectFolderPath(ctx, [SITE_WALK_ROOT, child]);
  if (taxonomyId) return taxonomyId;

  const legacyParent = await lookupFolderByParent(ctx, "Site Walk Files", null);
  if (!legacyParent) return null;

  const legacyChild = LEGACY_SITE_WALK_CHILD_ALIASES[child];
  const legacyRow = await lookupFolderByParent(ctx, legacyChild, legacyParent.id);
  return legacyRow?.id ?? null;
}

/**
 * Resolves by leaf folder name with taxonomy-first, then legacy flat fallback.
 * Used by PM artifact routes that still pass a single folder label.
 */
export async function resolveProjectFolderIdByName(
  projectId: string,
  folderName: string,
  orgId: string | null,
  userId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const ctx: ResolveContext = { admin, projectId, orgId, userId };

  const taxonomyPath = LEGACY_ARTIFACT_FOLDER_PATHS[folderName];
  if (taxonomyPath) {
    const taxonomyId = await resolveProjectFolderPath(ctx, taxonomyPath);
    if (taxonomyId) return taxonomyId;
  }

  if (folderName === "Photos" || folderName === "Deliverables") {
    const siteWalkChild = folderName as SiteWalkCaptureFolder;
    const siteWalkId = await resolveSiteWalkCaptureFolder(ctx, siteWalkChild);
    if (siteWalkId) return siteWalkId;
  }

  const flat = await lookupFolderByParent(ctx, folderName, null);
  if (flat) return flat.id;

  let legacyQuery = admin
    .from("project_folders")
    .select("id")
    .eq("parent_id", projectId)
    .eq("name", folderName)
    .limit(1);

  legacyQuery = orgId ? legacyQuery.eq("org_id", orgId) : legacyQuery.eq("created_by", userId);

  const { data: legacyData, error: legacyError } = await legacyQuery.maybeSingle<FolderRow>();
  if (legacyError) throw new Error(legacyError.message);

  return legacyData?.id ?? null;
}
