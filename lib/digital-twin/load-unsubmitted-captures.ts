import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type UnsubmittedTwinCapture = {
  id: string;
  title: string;
  spaceId: string;
  projectId: string | null;
  updatedAt: string;
  counts: { video: number; photo: number; lidar: number; other: number };
  assetTotal: number;
};

type CaptureRow = {
  id: string;
  title: string | null;
  space_id: string;
  project_id: string | null;
  capture_status: string | null;
  updated_at: string | null;
  created_at: string;
};

type AssetRow = { capture_id: string; asset_kind: string | null };

// A draft with zero assets less than this old is probably still being filled in —
// keep it in the main "Continue your captures" view. Older than this, it's clutter:
// drop it from the main view but keep it reachable under the Drafts filter (no
// destructive deletion in this slice).
const STALE_EMPTY_DRAFT_MS = 24 * 60 * 60 * 1000;

function bucketFor(kind: string | null): "video" | "photo" | "lidar" | "other" {
  const k = (kind ?? "").toLowerCase();
  if (k.includes("lidar") || k.includes("ply") || k.includes("mesh")) return "lidar";
  if (k.includes("video") || k.includes("panorama") || k === "drone_video") return "video";
  if (k.includes("photo") || k.includes("image")) return "photo";
  return "other";
}

export type UnsubmittedTwinCaptures = {
  /** Shown in the main "Continue your captures" view. */
  main: UnsubmittedTwinCapture[];
  /** Zero-asset drafts older than STALE_EMPTY_DRAFT_MS — hidden from `main`, still
   *  reachable via the Drafts filter. Nothing here is deleted. */
  staleDrafts: UnsubmittedTwinCapture[];
};

/**
 * Captures uploaded from the phone but NOT yet submitted for processing
 * (status draft/uploaded, no processing job). Surfaced on desktop so users can
 * resume — see what the phone uploaded (video / photo / LiDAR) and add more.
 */
export async function loadUnsubmittedTwinCaptures(
  orgId: string | null,
): Promise<UnsubmittedTwinCaptures> {
  if (!orgId) return { main: [], staleDrafts: [] };

  const admin = createAdminClient();

  const { data: captures, error } = await admin
    .from("digital_twin_captures")
    .select("id, title, space_id, project_id, capture_status, updated_at, created_at")
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .in("capture_status", ["draft", "uploaded"])
    .order("updated_at", { ascending: false })
    .limit(24);

  if (error || !captures?.length) return { main: [], staleDrafts: [] };

  const captureIds = (captures as CaptureRow[]).map((c) => c.id);

  // Exclude any capture that already has a processing job (it was submitted).
  const { data: jobs } = await admin
    .from("digital_twin_processing_jobs")
    .select("capture_id")
    .eq("org_id", orgId)
    .in("capture_id", captureIds);
  const submitted = new Set((jobs ?? []).map((j) => j.capture_id as string));

  const { data: assets } = await admin
    .from("digital_twin_capture_assets")
    .select("capture_id, asset_kind")
    .eq("org_id", orgId)
    .in("capture_id", captureIds)
    .is("deleted_at", null)
    .neq("status", "archived");

  const countsByCapture = new Map<string, UnsubmittedTwinCapture["counts"]>();
  for (const a of (assets ?? []) as AssetRow[]) {
    const c = countsByCapture.get(a.capture_id) ?? { video: 0, photo: 0, lidar: 0, other: 0 };
    c[bucketFor(a.asset_kind)] += 1;
    countsByCapture.set(a.capture_id, c);
  }

  const resolved = (captures as CaptureRow[])
    .filter((c) => !submitted.has(c.id))
    .map((c) => {
      const counts = countsByCapture.get(c.id) ?? { video: 0, photo: 0, lidar: 0, other: 0 };
      const assetTotal = counts.video + counts.photo + counts.lidar + counts.other;
      return {
        id: c.id,
        title: c.title ?? "Untitled capture",
        spaceId: c.space_id,
        projectId: c.project_id,
        updatedAt: c.updated_at ?? c.created_at,
        counts,
        assetTotal,
      };
    });

  const main: UnsubmittedTwinCapture[] = [];
  const staleDrafts: UnsubmittedTwinCapture[] = [];
  for (const capture of resolved) {
    const isStaleEmptyDraft =
      capture.assetTotal === 0 && Date.now() - new Date(capture.updatedAt).getTime() > STALE_EMPTY_DRAFT_MS;
    (isStaleEmptyDraft ? staleDrafts : main).push(capture);
  }

  return { main, staleDrafts };
}
