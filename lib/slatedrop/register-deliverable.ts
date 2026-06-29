import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSiteWalkCaptureFolder } from "@/lib/slatedrop/folder-resolver";

type Opts = {
  admin: SupabaseClient;
  projectId: string | null;
  orgId: string | null;
  userId: string;
  deliverableId: string;
  title: string;
};

/**
 * Registers a Site Walk deliverable into its project's SlateDrop `Deliverables`
 * folder so the user can navigate to it (open the interactive link, hand a file
 * to a client, etc.) from SlateDrop — not just from the walk it came from.
 *
 * Idempotent (keyed by the synthetic `deliverable://<id>` storage key) and
 * NON-FATAL: a SlateDrop registration failure must never break deliverable
 * creation. Project-less walks have no SlateDrop folder and are skipped.
 */
export async function registerDeliverableInSlateDrop({
  admin,
  projectId,
  orgId,
  userId,
  deliverableId,
  title,
}: Opts): Promise<void> {
  if (!projectId) return;
  try {
    const folderId = await resolveSiteWalkCaptureFolder(
      { admin, projectId, orgId, userId },
      "Deliverables",
    );
    if (!folderId) return;

    const storageKey = `deliverable://${deliverableId}`;
    const name = title?.trim() || "Untitled Report";
    const metadata = {
      deliverableId,
      kind: "site_walk_deliverable",
      // Where the SlateDrop UI should deep-link when this item is opened.
      openPath: `/site-walk/deliverables/${deliverableId}`,
    };

    const { data: existing } = await admin
      .from("unified_files")
      .select("id")
      .eq("storage_key", storageKey)
      .maybeSingle<{ id: string }>();

    if (existing) {
      await admin
        .from("unified_files")
        .update({ name, status: "ready", folder_id: folderId, metadata })
        .eq("id", existing.id);
      return;
    }

    await admin.from("unified_files").insert({
      project_id: projectId,
      org_id: orgId,
      name,
      original_name: name,
      type: "deliverable",
      mime_type: null,
      size_bytes: 0,
      storage_key: storageKey,
      source: "deliverable",
      folder_id: folderId,
      status: "ready",
      uploaded_by: userId,
      metadata,
      file_type: "deliverable",
    });
  } catch {
    // Non-fatal — deliverable creation must succeed regardless.
  }
}
