import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveTwinProjectFolder } from "@/lib/site-walk/slatedrop-folders";
import { twinAssetFolderPath } from "@/lib/slatedrop/folder-taxonomy";

type Opts = {
  admin: SupabaseClient;
  projectId: string | null;
  orgId: string | null;
  userId: string;
  /** The twin SPACE id — the user-facing unit and the deep-link target. */
  spaceId: string;
  title: string;
};

/** Sentinel s3_key prefix marking a SlateDrop row as a Twin 360 deliverable LINK
 * (the finished twin, openable in the viewer — not a downloadable file). A future
 * SlateDrop click-handler should route `twin-deliverable://<spaceId>` to
 * `/digital-twin/twins/<spaceId>` (the in-app analog of the Site Walk deliverable). */
export const TWIN_DELIVERABLE_LINK_PREFIX = "twin-deliverable://";

/**
 * Registers a finished Twin 360 reconstruction into its project's SlateDrop
 * `03_Digital_Twin/Deliverables` folder so the presentable output has a home next
 * to (not buried in) the raw model assets — the Twin analog of
 * {@link registerDeliverableInSlateDrop} for Site Walk.
 *
 * The raw `.spz`/model file is still bridged separately into `03_Digital_Twin/Models`
 * by `bridgeTwinModelToSlateDrop`; this registers the *deliverable* (the openable twin)
 * as a link-style row in `slatedrop_uploads` (the table the browser lists), keyed on the
 * SPACE id so reprocessing into new models updates one stable deliverable rather than
 * multiplying rows. Idempotent (sentinel s3_key) and NON-FATAL — a failure here must
 * never break twin job completion. Project-less twins are skipped.
 */
export async function registerTwinDeliverableInSlateDrop({
  admin,
  projectId,
  orgId,
  userId,
  spaceId,
  title,
}: Opts): Promise<void> {
  if (!projectId || !orgId) return;
  try {
    const folderId = await resolveTwinProjectFolder(
      admin,
      projectId,
      orgId,
      userId,
      twinAssetFolderPath("Deliverables"),
    );
    if (!folderId) return;

    const s3Key = `${TWIN_DELIVERABLE_LINK_PREFIX}${spaceId}`;
    const name = `${title?.trim() || "Untitled Twin"} (twin viewer)`;

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
      file_type: "twin_deliverable",
      s3_key: s3Key,
      folder_id: folderId,
      org_id: orgId,
      uploaded_by: userId,
      status: "active",
    });
  } catch {
    // Non-fatal — twin job completion must succeed regardless.
  }
}
