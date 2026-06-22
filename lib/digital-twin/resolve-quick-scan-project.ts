import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { provisionProjectFolders } from "@/lib/slatedrop/provisioning";

const QUICK_SCAN_POOL_NAME = "Quick Scans";
const QUICK_SCAN_POOL_META_KEY = "twin_quick_scan_pool";

type AdminClient = SupabaseClient;

type QuickScanProject = {
  id: string;
  name: string;
};

/** Ensures an org-level pool project exists for ad-hoc quick scans (zero user projects). */
export async function resolveOrCreateQuickScanProject(
  admin: AdminClient,
  orgId: string,
  userId: string,
): Promise<QuickScanProject> {
  const { data: orgProjects, error: listError } = await admin
    .from("projects")
    .select("id, name, metadata")
    .eq("org_id", orgId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(50);

  if (listError) throw new Error(listError.message);

  const pool = (orgProjects ?? []).find((row) => {
    const meta = row.metadata;
    return (
      meta &&
      typeof meta === "object" &&
      (meta as Record<string, unknown>)[QUICK_SCAN_POOL_META_KEY] === true
    );
  });

  if (pool?.id) {
    return { id: pool.id, name: pool.name ?? QUICK_SCAN_POOL_NAME };
  }

  const { data: created, error: insertError } = await admin
    .from("projects")
    .insert({
      org_id: orgId,
      name: QUICK_SCAN_POOL_NAME,
      status: "active",
      created_by: userId,
      project_type: "field",
      metadata: { [QUICK_SCAN_POOL_META_KEY]: true },
    })
    .select("id, name")
    .single();

  if (insertError || !created?.id) {
    throw new Error(insertError?.message ?? "Failed to create quick scan project");
  }

  const { error: memberError } = await admin.from("project_members").insert({
    project_id: created.id,
    user_id: userId,
    role_id: "owner",
    status: "active",
  });

  if (memberError) {
    await admin.from("projects").delete().eq("id", created.id);
    throw new Error(memberError.message);
  }

  // Provision the numbered SlateDrop subfolder taxonomy so quick-scan projects
  // get the same folder structure as projects created via /api/projects/create.
  // Best-effort: a failure here is backstopped by lazy provisioning on first
  // SlateDrop view, so it must not block the scan.
  try {
    await provisionProjectFolders(created.id, created.name ?? QUICK_SCAN_POOL_NAME, orgId, userId);
  } catch (provisionError) {
    console.error("[quick-scan] folder provisioning failed", provisionError);
  }

  return { id: created.id, name: created.name ?? QUICK_SCAN_POOL_NAME };
}
