import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveProjectFolderPath,
  resolveSiteWalkCaptureFolder,
} from "@/lib/slatedrop/folder-resolver";
import type { SiteWalkCaptureFolder } from "@/lib/slatedrop/folder-taxonomy";
import { generateProjectFolderTree } from "@/lib/slatedrop/folder-generator";

type EnsureSiteWalkFolderParams = {
  admin: SupabaseClient;
  projectId: string;
  orgId: string;
  userId: string;
  childName: SiteWalkCaptureFolder;
  projectName?: string;
};

export async function ensureSiteWalkProjectFolder({
  admin,
  projectId,
  orgId,
  userId,
  childName,
  projectName,
}: EnsureSiteWalkFolderParams): Promise<string | null> {
  const ctx = { admin, projectId, orgId, userId };

  let folderId = await resolveSiteWalkCaptureFolder(ctx, childName);
  if (folderId) return folderId;

  await generateProjectFolderTree(
    projectId,
    projectName ?? "Project",
    orgId,
    userId,
    admin,
  );

  folderId = await resolveSiteWalkCaptureFolder(ctx, childName);
  return folderId;
}

export async function resolveTwinProjectFolder(
  admin: SupabaseClient,
  projectId: string,
  orgId: string,
  userId: string,
  pathSegments: readonly string[],
  projectName?: string,
): Promise<string | null> {
  const ctx = { admin, projectId, orgId, userId };

  let folderId = await resolveProjectFolderPath(ctx, pathSegments);
  if (folderId) return folderId;

  await generateProjectFolderTree(projectId, projectName ?? "Project", orgId, userId, admin);
  return resolveProjectFolderPath(ctx, pathSegments);
}
