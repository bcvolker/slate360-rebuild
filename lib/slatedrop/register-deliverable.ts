import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureSiteWalkProjectFolder } from "@/lib/site-walk/slatedrop-folders";
import { DELIVERABLE_LINK_PREFIX } from "@/lib/slatedrop/deliverable-sentinel";

type Opts = {
  admin: SupabaseClient;
  projectId: string | null;
  orgId: string | null;
  userId: string;
  deliverableId: string;
  title: string;
};

export { DELIVERABLE_LINK_PREFIX };

/**
 * Registers a Site Walk deliverable into its project's SlateDrop `Deliverables`
 * folder so the user can navigate to the interactive deliverable straight from
 * SlateDrop (the exported PDF file is bridged separately by bridgePdfToSlateDrop).
 *
 * Inserts into `slatedrop_uploads` — the table the SlateDrop browser actually
 * lists — with file_type "deliverable" and a sentinel s3_key. Idempotent
 * (keyed by the sentinel s3_key) and NON-FATAL: a registration failure must
 * never break deliverable creation. Project-less walks are skipped.
 */
export async function registerDeliverableInSlateDrop({
  admin,
  projectId,
  orgId,
  userId,
  deliverableId,
  title,
}: Opts): Promise<void> {
  if (!projectId || !orgId) return;
  try {
    const folderId = await ensureSiteWalkProjectFolder({
      admin,
      projectId,
      orgId,
      userId,
      childName: "Deliverables",
    });
    if (!folderId) return;

    const s3Key = `${DELIVERABLE_LINK_PREFIX}${deliverableId}`;
    const name = `${(title?.trim() || "Untitled Report")} (interactive link)`;

    const { data: existing } = await admin
      .from("slatedrop_uploads")
      .select("id")
      .eq("s3_key", s3Key)
      .maybeSingle<{ id: string }>();

    if (existing) {
      await admin
        .from("slatedrop_uploads")
        .update({ file_name: name, folder_id: folderId, status: "active" })
        .eq("id", existing.id);
      return;
    }

    await admin.from("slatedrop_uploads").insert({
      file_name: name,
      file_size: 0,
      file_type: "deliverable",
      s3_key: s3Key,
      folder_id: folderId,
      org_id: orgId,
      uploaded_by: userId,
      status: "active",
    });
  } catch {
    // Non-fatal — deliverable creation must succeed regardless.
  }
}
