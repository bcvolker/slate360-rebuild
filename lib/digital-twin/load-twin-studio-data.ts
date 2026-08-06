import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type TwinStudioSpace = {
  spaceId: string;
  spaceTitle: string;
  status: string;
  /** Most recent capture on this space — used to key useTwinJobRealtime and
   * as the default reprocess/retry target. Null for a space with no capture yet. */
  latestCaptureId: string | null;
};

/**
 * F1 Produce board loader. Deliberately does NOT require a ready model (unlike
 * loadTwinSpaceViewerData/loadDesktopEditorData) — the Produce board's whole
 * job is to show a space through capture/processing/failed states, not only
 * once a splat exists.
 */
export async function loadTwinStudioSpace(
  spaceId: string,
  orgId: string | null,
): Promise<TwinStudioSpace | null> {
  if (!orgId) return null;
  const admin = createAdminClient();

  const { data: space } = await admin
    .from("digital_twin_spaces")
    .select("id, title, status")
    .eq("id", spaceId)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!space) return null;

  const { data: capture } = await admin
    .from("digital_twin_captures")
    .select("id")
    .eq("space_id", spaceId)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    spaceId: space.id,
    spaceTitle: space.title,
    status: space.status,
    latestCaptureId: capture?.id ?? null,
  };
}
